//! Server agent · Sprint Server Wire.
//!
//! Allowlisted SSH command execution. The UI must never execute commands
//! directly — every action passes through one of the `server_*` Tauri
//! commands below, which:
//!
//!   1. validates the command id is in the static allowlist
//!   2. validates any `name` argument matches a strict character set
//!      and (for restart) is present in the profile's per-kind allowlist
//!   3. composes an SSH command using a hard-coded BatchMode (no password
//!      prompt, no TTY allocation) and StrictHostKeyChecking=accept-new
//!   4. shells out via `std::process::Command` and captures stdout/stderr
//!   5. returns a structured `AgentResponse` · never raw shell strings
//!      assembled from untrusted input
//!
//! What this module never does:
//!   - read or store passwords
//!   - accept arbitrary command strings from the UI
//!   - shell-interpolate untrusted strings (everything is whitelisted)
//!   - spawn an interactive shell
//!
//! Audit is performed on the frontend side (before invoke + after
//! response). The Rust agent's job is enforcement, not logging.

use serde::{Deserialize, Serialize};
use std::process::{Command, Output, Stdio};
use std::time::Instant;

// ---------------------------------------------------------------------------
// Profile passed from the UI (mirrors `ServerProfile` in the TypeScript
// store). We do NOT receive a password; only host, port, user, optional
// SSH key path, and the per-kind allowlists for restart actions.
// ---------------------------------------------------------------------------

#[derive(Deserialize, Debug, Clone)]
pub struct ServerProfileIn {
    pub id: String,
    pub name: String,
    pub host: String,
    #[serde(rename = "sshUser")]
    pub ssh_user: String,
    pub port: u16,
    #[serde(rename = "sshKeyPath", default)]
    pub ssh_key_path: Option<String>,
    #[serde(rename = "allowedPm2Apps", default)]
    pub allowed_pm2_apps: Vec<String>,
    #[serde(rename = "allowedDockerContainers", default)]
    pub allowed_docker_containers: Vec<String>,
    #[serde(rename = "allowedSystemdServices", default)]
    pub allowed_systemd_services: Vec<String>,
}

#[derive(Serialize, Debug)]
pub struct AgentResponse<T: Serialize> {
    pub ok: bool,
    pub data: Option<T>,
    pub error: Option<String>,
    pub command: String,
    pub started_at_ms: u128,
    pub duration_ms: u128,
}

#[derive(Serialize, Debug, Default)]
pub struct StatusOut {
    pub online: bool,
    pub latency_ms: Option<u128>,
    pub cpu_pct: Option<f64>,
    pub mem_pct: Option<f64>,
    pub disk_pct: Option<f64>,
    pub uptime_sec: Option<u64>,
    pub raw_uptime: Option<String>,
    pub raw_df: Option<String>,
    pub raw_free: Option<String>,
}

#[derive(Serialize, Debug, Clone)]
#[serde(rename_all = "lowercase")]
pub enum ServiceKind {
    Docker,
    Pm2,
    Systemd,
}

#[derive(Serialize, Debug, Clone)]
#[serde(rename_all = "lowercase")]
pub enum ServiceState {
    Running,
    Stopped,
    Errored,
    Unknown,
}

#[derive(Serialize, Debug)]
pub struct ServiceOut {
    pub id: String,
    pub name: String,
    pub kind: ServiceKind,
    pub state: ServiceState,
    pub detail: Option<String>,
}

#[derive(Serialize, Debug)]
pub struct LogsOut {
    pub lines: Vec<String>,
}

#[derive(Serialize, Debug)]
pub struct RestartOut {
    pub restarted: bool,
    pub stdout: String,
    pub stderr: String,
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

fn valid_name(name: &str) -> bool {
    // Strict: alphanumerics + dot + underscore + dash. No spaces, no
    // shell metacharacters, no slashes. This is the only character set
    // we will pass as an argument to pm2 / docker / systemctl.
    !name.is_empty()
        && name.len() <= 64
        && name
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '_' || c == '-')
}

fn valid_host(host: &str) -> bool {
    !host.is_empty()
        && host.len() <= 253
        && host
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == ':')
}

fn valid_ssh_user(user: &str) -> bool {
    !user.is_empty()
        && user.len() <= 32
        && user
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '_' || c == '-')
}

fn validate_profile(p: &ServerProfileIn) -> Result<(), String> {
    if !valid_host(&p.host) {
        return Err("invalid host".into());
    }
    if !valid_ssh_user(&p.ssh_user) {
        return Err("invalid ssh user".into());
    }
    if p.port == 0 {
        return Err("invalid port".into());
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// SSH command execution
// ---------------------------------------------------------------------------

const SSH_TIMEOUT_SECS: u64 = 8;

/// Run a remote command via `ssh`. The remote command is composed from
/// fixed string fragments and a small set of pre-validated whitelist
/// values · we never pass user-supplied free-form strings.
fn ssh_exec(profile: &ServerProfileIn, remote_cmd: &str) -> Result<Output, String> {
    let port_str = profile.port.to_string();
    let user_host = format!("{}@{}", profile.ssh_user, profile.host);
    let mut cmd = Command::new("ssh");
    cmd.arg("-o")
        .arg("BatchMode=yes")
        .arg("-o")
        .arg(format!("ConnectTimeout={}", SSH_TIMEOUT_SECS))
        .arg("-o")
        .arg("StrictHostKeyChecking=accept-new")
        .arg("-o")
        .arg("PasswordAuthentication=no")
        .arg("-o")
        .arg("KbdInteractiveAuthentication=no")
        .arg("-p")
        .arg(&port_str);
    if let Some(key) = profile.ssh_key_path.as_deref() {
        if !key.is_empty() {
            cmd.arg("-i").arg(key);
        }
    }
    cmd.arg(&user_host)
        .arg("--")
        .arg(remote_cmd)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    cmd.output()
        .map_err(|e| format!("failed to spawn ssh: {}", e))
}

fn now_ms() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

fn wrap<T: Serialize>(
    command: &str,
    started_at_ms: u128,
    started: Instant,
    result: Result<T, String>,
) -> AgentResponse<T> {
    let duration_ms = started.elapsed().as_millis();
    match result {
        Ok(data) => AgentResponse {
            ok: true,
            data: Some(data),
            error: None,
            command: command.to_string(),
            started_at_ms,
            duration_ms,
        },
        Err(e) => AgentResponse {
            ok: false,
            data: None,
            error: Some(e),
            command: command.to_string(),
            started_at_ms,
            duration_ms,
        },
    }
}

async fn run<T, F>(f: F) -> Result<T, String>
where
    F: FnOnce() -> Result<T, String> + Send + 'static,
    T: Send + 'static,
{
    tauri::async_runtime::spawn_blocking(f)
        .await
        .map_err(|e| format!("worker error: {}", e))
        .and_then(std::convert::identity)
}

fn output_strings(o: &Output) -> (String, String, i32) {
    let stdout = String::from_utf8_lossy(&o.stdout).to_string();
    let stderr = String::from_utf8_lossy(&o.stderr).to_string();
    let code = o.status.code().unwrap_or(-1);
    (stdout, stderr, code)
}

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

fn parse_uptime_seconds(s: &str) -> Option<u64> {
    let s = s.trim();
    if let Ok(n) = s.parse::<f64>() {
        return Some(n as u64);
    }
    None
}

fn parse_df_root_pct(out: &str) -> Option<f64> {
    for line in out.lines().skip(1) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 6 {
            continue;
        }
        let mount = parts[parts.len() - 1];
        if mount == "/" {
            let pct = parts[parts.len() - 2].trim_end_matches('%');
            return pct.parse::<f64>().ok();
        }
    }
    None
}

fn parse_free_mem_pct(out: &str) -> Option<f64> {
    for line in out.lines() {
        let trimmed = line.trim();
        if trimmed.to_lowercase().starts_with("mem:") {
            let parts: Vec<&str> = trimmed.split_whitespace().collect();
            if parts.len() >= 3 {
                let total: f64 = parts[1].parse().ok()?;
                let used: f64 = parts[2].parse().ok()?;
                if total > 0.0 {
                    return Some(used / total * 100.0);
                }
            }
        }
    }
    None
}

#[derive(Deserialize)]
struct Pm2Process {
    name: String,
    #[serde(default)]
    pm2_env: Option<Pm2Env>,
}

#[derive(Deserialize)]
struct Pm2Env {
    #[serde(default)]
    status: Option<String>,
}

fn parse_pm2_jlist(out: &str) -> Vec<ServiceOut> {
    let parsed: Vec<Pm2Process> = serde_json::from_str(out).unwrap_or_default();
    parsed
        .into_iter()
        .map(|p| {
            let status = p
                .pm2_env
                .as_ref()
                .and_then(|e| e.status.clone())
                .unwrap_or_else(|| "unknown".to_string());
            let state = match status.as_str() {
                "online" => ServiceState::Running,
                "stopped" | "stopping" => ServiceState::Stopped,
                "errored" => ServiceState::Errored,
                _ => ServiceState::Unknown,
            };
            ServiceOut {
                id: format!("pm2:{}", p.name),
                name: p.name,
                kind: ServiceKind::Pm2,
                state,
                detail: Some(format!("pm2 · {}", status)),
            }
        })
        .collect()
}

fn parse_docker_ps(out: &str) -> Vec<ServiceOut> {
    out.lines()
        .filter_map(|line| {
            let v: serde_json::Value = serde_json::from_str(line).ok()?;
            let name = v.get("Names").and_then(|x| x.as_str()).unwrap_or("").to_string();
            let status = v.get("Status").and_then(|x| x.as_str()).unwrap_or("").to_string();
            let image = v.get("Image").and_then(|x| x.as_str()).unwrap_or("").to_string();
            if name.is_empty() {
                return None;
            }
            let state = if status.starts_with("Up") {
                ServiceState::Running
            } else if status.is_empty() {
                ServiceState::Unknown
            } else {
                ServiceState::Stopped
            };
            Some(ServiceOut {
                id: format!("docker:{}", name),
                name,
                kind: ServiceKind::Docker,
                state,
                detail: Some(format!("{} · {}", image, status)),
            })
        })
        .collect()
}

fn parse_systemd_is_active(name: &str, out: &str) -> ServiceOut {
    let trimmed = out.trim();
    let state = match trimmed {
        "active" => ServiceState::Running,
        "inactive" | "deactivating" => ServiceState::Stopped,
        "failed" => ServiceState::Errored,
        _ => ServiceState::Unknown,
    };
    ServiceOut {
        id: format!("systemd:{}", name),
        name: name.to_string(),
        kind: ServiceKind::Systemd,
        state,
        detail: Some(format!("systemd · {}", trimmed)),
    }
}

// ---------------------------------------------------------------------------
// Tauri commands · the public agent surface
// ---------------------------------------------------------------------------

/// Confirm the bridge is present and ready to dispatch.
#[tauri::command]
pub fn server_agent_status() -> serde_json::Value {
    serde_json::json!({
        "ok": true,
        "status": "ready",
        "allowed_commands": [
            "probe-status",
            "list-pm2",
            "list-docker",
            "list-systemd",
            "logs-systemd",
            "logs-docker",
            "logs-pm2",
            "restart-pm2",
            "restart-docker",
            "restart-systemd"
        ]
    })
}

/// Combined read-only probe · `df -h`, `free -m`, `uptime -s`.
#[tauri::command]
pub async fn server_probe_status(
    profile: ServerProfileIn,
) -> Result<AgentResponse<StatusOut>, String> {
    let started_at = now_ms();
    let started = Instant::now();
    if let Err(e) = validate_profile(&profile) {
        return Ok(wrap("probe-status", started_at, started, Err(e)));
    }
    let p = profile.clone();
    let res = run(move || {
        // One round-trip · multi-statement remote command using ';' which
        // is a fixed string · no user interpolation.
        let remote =
            "echo '---uptime---'; cat /proc/uptime || true; \
             echo '---df---'; df -hP /; \
             echo '---free---'; free -m";
        let out = ssh_exec(&p, remote)?;
        let (stdout, stderr, code) = output_strings(&out);
        if code != 0 && stdout.is_empty() {
            return Err(format!("ssh exit {}: {}", code, stderr.trim()));
        }
        let mut up_raw: Option<String> = None;
        let mut df_raw: Option<String> = None;
        let mut free_raw: Option<String> = None;
        let mut section = "";
        let mut up_buf = String::new();
        let mut df_buf = String::new();
        let mut free_buf = String::new();
        for line in stdout.lines() {
            match line.trim() {
                "---uptime---" => section = "up",
                "---df---" => section = "df",
                "---free---" => section = "free",
                _ => match section {
                    "up" => {
                        up_buf.push_str(line);
                        up_buf.push('\n');
                    }
                    "df" => {
                        df_buf.push_str(line);
                        df_buf.push('\n');
                    }
                    "free" => {
                        free_buf.push_str(line);
                        free_buf.push('\n');
                    }
                    _ => {}
                },
            }
        }
        let uptime_sec = up_buf
            .split_whitespace()
            .next()
            .and_then(parse_uptime_seconds);
        let disk_pct = parse_df_root_pct(&df_buf);
        let mem_pct = parse_free_mem_pct(&free_buf);
        if !up_buf.is_empty() {
            up_raw = Some(up_buf);
        }
        if !df_buf.is_empty() {
            df_raw = Some(df_buf);
        }
        if !free_buf.is_empty() {
            free_raw = Some(free_buf);
        }
        Ok(StatusOut {
            online: true,
            latency_ms: None,
            cpu_pct: None,
            mem_pct,
            disk_pct,
            uptime_sec,
            raw_uptime: up_raw,
            raw_df: df_raw,
            raw_free: free_raw,
        })
    })
    .await;
    let res = match res {
        Ok(v) => Ok(v),
        Err(e) => Err(e),
    };
    Ok(wrap("probe-status", started_at, started, res))
}

#[tauri::command]
pub async fn server_list_pm2(
    profile: ServerProfileIn,
) -> Result<AgentResponse<Vec<ServiceOut>>, String> {
    let started_at = now_ms();
    let started = Instant::now();
    if let Err(e) = validate_profile(&profile) {
        return Ok(wrap("list-pm2", started_at, started, Err(e)));
    }
    let p = profile.clone();
    let res = run(move || {
        let out = ssh_exec(&p, "pm2 jlist")?;
        let (stdout, stderr, code) = output_strings(&out);
        if code != 0 {
            return Err(format!("pm2 exit {}: {}", code, stderr.trim()));
        }
        Ok(parse_pm2_jlist(&stdout))
    })
    .await;
    Ok(wrap("list-pm2", started_at, started, res))
}

#[tauri::command]
pub async fn server_list_docker(
    profile: ServerProfileIn,
) -> Result<AgentResponse<Vec<ServiceOut>>, String> {
    let started_at = now_ms();
    let started = Instant::now();
    if let Err(e) = validate_profile(&profile) {
        return Ok(wrap("list-docker", started_at, started, Err(e)));
    }
    let p = profile.clone();
    let res = run(move || {
        let out = ssh_exec(&p, "docker ps --format '{{json .}}'")?;
        let (stdout, stderr, code) = output_strings(&out);
        if code != 0 {
            return Err(format!("docker exit {}: {}", code, stderr.trim()));
        }
        Ok(parse_docker_ps(&stdout))
    })
    .await;
    Ok(wrap("list-docker", started_at, started, res))
}

#[tauri::command]
pub async fn server_list_systemd(
    profile: ServerProfileIn,
) -> Result<AgentResponse<Vec<ServiceOut>>, String> {
    let started_at = now_ms();
    let started = Instant::now();
    if let Err(e) = validate_profile(&profile) {
        return Ok(wrap("list-systemd", started_at, started, Err(e)));
    }
    let allowed = profile.allowed_systemd_services.clone();
    let p = profile.clone();
    let res = run(move || {
        let mut results: Vec<ServiceOut> = Vec::new();
        for name in &allowed {
            if !valid_name(name) {
                continue;
            }
            let cmd = format!("systemctl is-active --quiet {0}; systemctl is-active {0}", name);
            let out = ssh_exec(&p, &cmd)?;
            let (stdout, _stderr, _code) = output_strings(&out);
            results.push(parse_systemd_is_active(name, &stdout));
        }
        Ok(results)
    })
    .await;
    Ok(wrap("list-systemd", started_at, started, res))
}

#[derive(Deserialize)]
pub struct LogsArgs {
    pub kind: String, // "pm2" | "docker" | "systemd"
    pub name: String,
    #[serde(default)]
    pub tail: Option<u32>,
}

#[tauri::command]
pub async fn server_logs(
    profile: ServerProfileIn,
    args: LogsArgs,
) -> Result<AgentResponse<LogsOut>, String> {
    let started_at = now_ms();
    let started = Instant::now();
    if let Err(e) = validate_profile(&profile) {
        return Ok(wrap("logs", started_at, started, Err(e)));
    }
    if !valid_name(&args.name) {
        return Ok(wrap(
            "logs",
            started_at,
            started,
            Err("name failed character validation".into()),
        ));
    }
    let tail = args.tail.unwrap_or(200).min(2000);
    let allowed = match args.kind.as_str() {
        "pm2" => profile.allowed_pm2_apps.contains(&args.name),
        "docker" => profile.allowed_docker_containers.contains(&args.name),
        "systemd" => profile.allowed_systemd_services.contains(&args.name),
        _ => false,
    };
    if !allowed {
        return Ok(wrap(
            "logs",
            started_at,
            started,
            Err(format!("'{}' not in {} allowlist for this profile", args.name, args.kind)),
        ));
    }
    let kind = args.kind.clone();
    let name = args.name.clone();
    let p = profile.clone();
    let res = run(move || {
        let remote = match kind.as_str() {
            "pm2" => format!("pm2 logs --lines {} --nostream {}", tail, name),
            "docker" => format!("docker logs --tail {} {}", tail, name),
            "systemd" => format!("journalctl -u {} -n {} --no-pager", name, tail),
            _ => return Err("unsupported kind".into()),
        };
        let out = ssh_exec(&p, &remote)?;
        let (stdout, stderr, code) = output_strings(&out);
        if code != 0 && stdout.is_empty() {
            return Err(format!("logs exit {}: {}", code, stderr.trim()));
        }
        let lines: Vec<String> = stdout.lines().map(|s| s.to_string()).collect();
        Ok(LogsOut { lines })
    })
    .await;
    Ok(wrap("logs", started_at, started, res))
}

#[derive(Deserialize)]
pub struct RestartArgs {
    pub kind: String, // "pm2" | "docker" | "systemd"
    pub name: String,
}

#[tauri::command]
pub async fn server_restart(
    profile: ServerProfileIn,
    args: RestartArgs,
) -> Result<AgentResponse<RestartOut>, String> {
    let started_at = now_ms();
    let started = Instant::now();
    if let Err(e) = validate_profile(&profile) {
        return Ok(wrap("restart", started_at, started, Err(e)));
    }
    if !valid_name(&args.name) {
        return Ok(wrap(
            "restart",
            started_at,
            started,
            Err("name failed character validation".into()),
        ));
    }
    let allowed = match args.kind.as_str() {
        "pm2" => profile.allowed_pm2_apps.contains(&args.name),
        "docker" => profile.allowed_docker_containers.contains(&args.name),
        "systemd" => profile.allowed_systemd_services.contains(&args.name),
        _ => false,
    };
    if !allowed {
        return Ok(wrap(
            "restart",
            started_at,
            started,
            Err(format!("'{}' not in {} allowlist for this profile", args.name, args.kind)),
        ));
    }
    let kind = args.kind.clone();
    let name = args.name.clone();
    let p = profile.clone();
    let res = run(move || {
        let remote = match kind.as_str() {
            "pm2" => format!("pm2 restart {}", name),
            "docker" => format!("docker restart {}", name),
            "systemd" => format!("systemctl restart {}", name),
            _ => return Err("unsupported kind".into()),
        };
        let out = ssh_exec(&p, &remote)?;
        let (stdout, stderr, code) = output_strings(&out);
        let restarted = code == 0;
        if restarted {
            Ok(RestartOut {
                restarted,
                stdout,
                stderr,
            })
        } else {
            Err(format!("restart exit {}: {}", code, stderr.trim()))
        }
    })
    .await;
    Ok(wrap("restart", started_at, started, res))
}


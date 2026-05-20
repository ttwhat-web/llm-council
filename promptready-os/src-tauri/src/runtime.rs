//! Runtime bridge · Sprint H.
//!
//! Desktop-only connector commands. Secrets (API tokens) are read from
//! process environment **inside Rust** and NEVER returned to the
//! frontend — commands return only `configured` flags, success/error, and
//! provider response data (which contains no secret). When no secure
//! store exists yet, env vars are the source of truth; a secure keychain
//! store is planned.
//!
//! NOTE: GUI apps launched from Finder do not inherit a shell's env. To
//! pass connector env vars today, launch Operator Core from a terminal
//! (e.g. `open` won't forward env; run the binary directly) or set them
//! in a launchd plist. The secure store will remove this limitation.

use serde::Serialize;
use serde_json::Value;
use std::env;

const ENV_KEYS: &[&str] = &[
    "TELEGRAM_BOT_TOKEN",
    "TELEGRAM_ALLOWED_CHAT_ID",
    "TWELVEDATA_API_KEY",
    "FMP_API_KEY",
    "NEWSAPI_KEY",
    "CRYPTOPANIC_API_KEY",
    "ETHERSCAN_API_KEY",
];

fn env_value(key: &str) -> Option<String> {
    match env::var(key) {
        Ok(v) if !v.trim().is_empty() => Some(v),
        _ => None,
    }
}

#[derive(Serialize)]
pub struct PingResult {
    ok: bool,
    runtime: String,
    version: String,
}

#[tauri::command]
pub fn runtime_ping() -> PingResult {
    PingResult {
        ok: true,
        runtime: "tauri".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    }
}

#[derive(Serialize)]
pub struct EnvKeyStatus {
    key: String,
    configured: bool,
}

/// Returns only whether each key is configured — never the value.
#[tauri::command]
pub fn runtime_get_env_status() -> Vec<EnvKeyStatus> {
    ENV_KEYS
        .iter()
        .map(|k| EnvKeyStatus {
            key: (*k).to_string(),
            configured: env_value(k).is_some(),
        })
        .collect()
}

#[derive(Serialize)]
pub struct OpResult {
    ok: bool,
    error: Option<String>,
}

fn op_err(msg: impl Into<String>) -> OpResult {
    OpResult {
        ok: false,
        error: Some(msg.into()),
    }
}

/// Send a Telegram message via the bot token in the environment.
#[tauri::command]
pub async fn runtime_telegram_send(text: String) -> OpResult {
    let token = match env_value("TELEGRAM_BOT_TOKEN") {
        Some(t) => t,
        None => return op_err("TELEGRAM_BOT_TOKEN not configured"),
    };
    let chat = match env_value("TELEGRAM_ALLOWED_CHAT_ID") {
        Some(c) => c,
        None => return op_err("TELEGRAM_ALLOWED_CHAT_ID not configured"),
    };
    let url = format!("https://api.telegram.org/bot{}/sendMessage", token);
    let client = reqwest::Client::new();
    let body = serde_json::json!({ "chat_id": chat, "text": text });
    match client.post(&url).json(&body).send().await {
        Ok(r) if r.status().is_success() => OpResult { ok: true, error: None },
        Ok(r) => op_err(format!("telegram HTTP {}", r.status().as_u16())),
        Err(e) => op_err(e.to_string()),
    }
}

#[derive(Serialize)]
pub struct PollResult {
    ok: bool,
    messages: Vec<String>,
    error: Option<String>,
}

/// Poll Telegram getUpdates once. Returns inbound message texts from the
/// allowed chat only (no secrets). The frontend routes these through the
/// existing command parser.
#[tauri::command]
pub async fn runtime_telegram_poll_once() -> PollResult {
    let token = match env_value("TELEGRAM_BOT_TOKEN") {
        Some(t) => t,
        None => {
            return PollResult {
                ok: false,
                messages: vec![],
                error: Some("TELEGRAM_BOT_TOKEN not configured".to_string()),
            }
        }
    };
    let allowed = env_value("TELEGRAM_ALLOWED_CHAT_ID");
    let url = format!("https://api.telegram.org/bot{}/getUpdates?timeout=0", token);
    let client = reqwest::Client::new();
    match client.get(&url).send().await {
        Ok(r) => match r.json::<Value>().await {
            Ok(j) => {
                let mut messages = vec![];
                if let Some(arr) = j.get("result").and_then(|v| v.as_array()) {
                    for upd in arr {
                        if let Some(allowed) = &allowed {
                            let cid = upd
                                .pointer("/message/chat/id")
                                .map(|v| v.to_string())
                                .unwrap_or_default();
                            if cid.trim_matches('"') != allowed {
                                continue;
                            }
                        }
                        if let Some(t) = upd.pointer("/message/text").and_then(|v| v.as_str()) {
                            messages.push(t.to_string());
                        }
                    }
                }
                PollResult {
                    ok: true,
                    messages,
                    error: None,
                }
            }
            Err(e) => PollResult {
                ok: false,
                messages: vec![],
                error: Some(e.to_string()),
            },
        },
        Err(e) => PollResult {
            ok: false,
            messages: vec![],
            error: Some(e.to_string()),
        },
    }
}

#[derive(Serialize)]
pub struct FetchResult {
    ok: bool,
    status: u16,
    data: Option<Value>,
    error: Option<String>,
}

fn fetch_err(msg: impl Into<String>) -> FetchResult {
    FetchResult {
        ok: false,
        status: 0,
        data: None,
        error: Some(msg.into()),
    }
}

/// Fetch from a keyed provider. The key is read from env in Rust and
/// never returned. `query` meaning is provider-specific (a symbol, a
/// topic, etc.).
#[tauri::command]
pub async fn runtime_provider_fetch(provider: String, query: Option<String>) -> FetchResult {
    let q = query.unwrap_or_default();
    let url = match provider.as_str() {
        "twelvedata" => match env_value("TWELVEDATA_API_KEY") {
            Some(k) => format!(
                "https://api.twelvedata.com/quote?symbol={}&apikey={}",
                urlencode(&q),
                k
            ),
            None => return fetch_err("TWELVEDATA_API_KEY not configured"),
        },
        "fmp" => match env_value("FMP_API_KEY") {
            Some(k) => format!(
                "https://financialmodelingprep.com/api/v3/quote/{}?apikey={}",
                urlencode(&q),
                k
            ),
            None => return fetch_err("FMP_API_KEY not configured"),
        },
        "newsapi" => match env_value("NEWSAPI_KEY") {
            Some(k) => {
                let topic = if q.is_empty() { "technology".to_string() } else { q.clone() };
                format!(
                    "https://newsapi.org/v2/everything?q={}&sortBy=publishedAt&pageSize=10&apiKey={}",
                    urlencode(&topic),
                    k
                )
            }
            None => return fetch_err("NEWSAPI_KEY not configured"),
        },
        "cryptopanic" => match env_value("CRYPTOPANIC_API_KEY") {
            Some(k) => format!(
                "https://cryptopanic.com/api/v1/posts/?auth_token={}&public=true",
                k
            ),
            None => return fetch_err("CRYPTOPANIC_API_KEY not configured"),
        },
        "etherscan" => match env_value("ETHERSCAN_API_KEY") {
            Some(k) => format!(
                "https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey={}",
                k
            ),
            None => return fetch_err("ETHERSCAN_API_KEY not configured"),
        },
        other => return fetch_err(format!("unknown provider: {}", other)),
    };

    let client = reqwest::Client::new();
    match client
        .get(&url)
        .header("User-Agent", "OperatorCore/0.1")
        .send()
        .await
    {
        Ok(r) => {
            let status = r.status().as_u16();
            match r.json::<Value>().await {
                Ok(data) => FetchResult {
                    ok: status < 400,
                    status,
                    data: Some(data),
                    error: if status < 400 {
                        None
                    } else {
                        Some(format!("HTTP {}", status))
                    },
                },
                Err(e) => FetchResult {
                    ok: false,
                    status,
                    data: None,
                    error: Some(e.to_string()),
                },
            }
        }
        Err(e) => fetch_err(e.to_string()),
    }
}

/// Minimal percent-encoding for query components (alnum + a few safe chars).
fn urlencode(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(b as char)
            }
            _ => out.push_str(&format!("%{:02X}", b)),
        }
    }
    out
}

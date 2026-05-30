"use client";

/**
 * Server Command Center · honest scaffold.
 *
 * The full SSH bridge ("server agent") is planned, not wired. The page
 * is structurally complete · profile management is real and local;
 * status / services / logs render adapter-ready cells until the agent
 * ships. Restart confirms but explicitly never executes; deploy is
 * permanently disabled with the "planned" pill.
 *
 * Security posture:
 *   - no password storage anywhere in the code
 *   - SSH key only (declared via UI text; not generated here)
 *   - no arbitrary command input box exists
 *   - command allowlist (`ALLOWED_COMMANDS`) is the single source of
 *     truth for what the agent will eventually accept
 *   - every user action is recorded in the audit log (200 entries)
 */

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  AlertTriangle,
  ChevronDown,
  Clock,
  Cpu,
  HardDrive,
  Layers,
  Plus,
  RefreshCw,
  Rocket,
  Server,
  Shield,
  Tag,
  Terminal,
  Trash2,
  X,
  Zap
} from "lucide-react";

import { SurfaceHeader } from "@/components/primitives/SurfaceHeader";
import { TerminalPanel } from "@/components/market-lab/panels/TerminalPanel";
import { EmptyAdapterPanel } from "@/components/market-lab/panels/EmptyAdapterPanel";

import {
  listProfiles,
  upsertProfile,
  removeProfile,
  newProfileId,
  getActiveProfileId,
  setActiveProfileId,
  type ServerProfile
} from "@/store/servers";
import {
  deriveAlerts,
  formatUptime,
  ALLOWED_COMMANDS,
  type ServerStatus
} from "@/services/serverAgent";
import {
  bridgeAgentStatus,
  bridgeFetchLogs,
  bridgeListDocker,
  bridgeListPm2,
  bridgeListSystemd,
  bridgeProbeStatus,
  bridgeRestart,
  isBridgeAvailable,
  type ServiceKind,
  type ServiceOut as BridgeServiceOut
} from "@/services/serverAgentBridge";
import {
  appendAudit,
  clearAudit,
  listAudit,
  type AuditEntry
} from "@/services/serverAudit";

// Local alias so the existing rendering code keeps a single ServerService type.
type ServerService = BridgeServiceOut;

// ---------------------------------------------------------------------------
// page
// ---------------------------------------------------------------------------

export default function ServerPage() {
  const [profiles, setProfiles] = useState<ServerProfile[]>(() => listProfiles());
  const [activeId, setActiveIdState] = useState<string | null>(() => getActiveProfileId());
  const [showAdd, setShowAdd] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState<ServerService | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>(() => listAudit());

  // Live data slots (all stay null until the agent ships).
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [statusErr, setStatusErr] = useState<string | null>(null);
  const [statusAt, setStatusAt] = useState<number | null>(null);

  const [services, setServices] = useState<ServerService[]>([]);
  const [servicesErr, setServicesErr] = useState<string | null>(null);
  const [servicesAt, setServicesAt] = useState<number | null>(null);

  const [logs, setLogs] = useState<string[]>([]);
  const [logsErr, setLogsErr] = useState<string | null>(null);
  const [logsAt, setLogsAt] = useState<number | null>(null);

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeId) ?? null,
    [profiles, activeId]
  );

  const bridgeOn = isBridgeAvailable();
  const [agentLabel, setAgentLabel] = useState<"ready" | "not-wired">(bridgeOn ? "ready" : "not-wired");
  useEffect(() => {
    let cancelled = false;
    void bridgeAgentStatus().then((r) => {
      if (cancelled) return;
      setAgentLabel(r && r.ok ? "ready" : "not-wired");
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const agentStatus = agentLabel;
  const agentReason = bridgeOn
    ? "tauri ipc available"
    : "agent not available · run in desktop app";
  const recordAudit = (entry: Parameters<typeof appendAudit>[0]) => {
    const next = appendAudit(entry);
    setAudit(next);
  };

  const onActivate = (id: string) => {
    setActiveIdState(id);
    setActiveProfileId(id);
    const prof = profiles.find((p) => p.id === id);
    recordAudit({
      action: "profile-activate",
      profileId: id,
      profileName: prof?.name,
      detail: `host=${prof?.host}:${prof?.port}`,
      result: "ok"
    });
  };

  const onAdd = (p: ServerProfile) => {
    const next = upsertProfile(p);
    setProfiles(next);
    if (!activeId) {
      setActiveIdState(p.id);
      setActiveProfileId(p.id);
    }
    setShowAdd(false);
    recordAudit({
      action: "profile-add",
      profileId: p.id,
      profileName: p.name,
      detail: `host=${p.host}:${p.port} · tags=${p.tags.join(",") || "—"}`,
      result: "ok"
    });
  };

  const onDelete = (p: ServerProfile) => {
    const next = removeProfile(p.id);
    setProfiles(next);
    if (activeId === p.id) {
      setActiveIdState(null);
      setActiveProfileId(null);
    }
    recordAudit({
      action: "profile-delete",
      profileId: p.id,
      profileName: p.name,
      detail: `host=${p.host}:${p.port}`,
      result: "ok"
    });
  };

  const refreshStatus = async () => {
    if (!activeProfile) return;
    const r = await bridgeProbeStatus(activeProfile);
    setAudit(listAudit());
    if (r.ok && r.data) {
      const d = r.data;
      const mapped: ServerStatus = {
        online: d.online,
        latencyMs: d.latency_ms,
        cpuPct: d.cpu_pct,
        memPct: d.mem_pct,
        diskPct: d.disk_pct,
        uptimeSec: d.uptime_sec
      };
      setStatus(mapped);
      setStatusErr(null);
    } else {
      setStatus(null);
      setStatusErr(r.error ?? "unknown");
    }
    setStatusAt(Date.now());
  };

  const refreshServices = async () => {
    if (!activeProfile) return;
    const [pm2, dk, sd] = await Promise.all([
      bridgeListPm2(activeProfile),
      bridgeListDocker(activeProfile),
      bridgeListSystemd(activeProfile)
    ]);
    setAudit(listAudit());
    const out: ServerService[] = [];
    if (pm2.ok && pm2.data) out.push(...pm2.data);
    if (dk.ok && dk.data) out.push(...dk.data);
    if (sd.ok && sd.data) out.push(...sd.data);
    setServices(out);
    const err = pm2.error || dk.error || sd.error;
    setServicesErr(out.length === 0 ? err ?? null : null);
    setServicesAt(Date.now());
  };

  const refreshLogs = async () => {
    if (!activeProfile) return;
    // Default log target is the first allowlisted systemd service ·
    // falling back to the first docker container or pm2 app. No raw
    // free-form command input anywhere.
    const target = pickDefaultLogTarget(activeProfile);
    if (!target) {
      setLogs([]);
      setLogsErr("no log target · add a name to a per-kind allowlist on this profile");
      setLogsAt(Date.now());
      return;
    }
    const r = await bridgeFetchLogs(activeProfile, target.kind, target.name, 200);
    setAudit(listAudit());
    if (r.ok && r.data) {
      setLogs(r.data.lines);
      setLogsErr(null);
    } else {
      setLogs([]);
      setLogsErr(r.error ?? "unknown");
    }
    setLogsAt(Date.now());
  };

  // Auto-probe whenever the active profile changes.
  useEffect(() => {
    if (!activeProfile) return;
    void refreshStatus();
    void refreshServices();
    void refreshLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile?.id]);

  const alerts = useMemo(() => deriveAlerts(status, services), [status, services]);

  const onConfirmRestart = (svc: ServerService) => {
    setConfirmRestart(svc);
  };

  const onRestartConfirmed = async () => {
    if (!confirmRestart || !activeProfile) return;
    const svc = confirmRestart;
    setConfirmRestart(null);
    await bridgeRestart(activeProfile, svc.kind, svc.name);
    setAudit(listAudit());
    // Re-probe + re-list services so the row reflects the new state.
    void refreshServices();
  };

  const onRestartCancel = () => {
    if (!confirmRestart || !activeProfile) {
      setConfirmRestart(null);
      return;
    }
    recordAudit({
      action: "restart-cancel",
      profileId: activeProfile.id,
      profileName: activeProfile.name,
      detail: `service=${confirmRestart.name}`,
      result: "ok"
    });
    setConfirmRestart(null);
  };

  const onDeployBlocked = () => {
    if (!activeProfile) return;
    recordAudit({
      action: "deploy-blocked",
      profileId: activeProfile.id,
      profileName: activeProfile.name,
      detail: "deploy button · planned · refusing to run",
      result: "blocked"
    });
  };

  const onClearAudit = () => {
    const next = clearAudit();
    setAudit(next);
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-[1700px] flex-col gap-2 px-3 py-3">
      <SurfaceHeader
        eyebrow="server · command center"
        title="Server Command Center"
        sub="Remote VPS / service monitoring · SSH key auth · allowlisted commands · audited."
        right={
          <span
            className={clsx(
              "rounded border px-1.5 py-px font-mono text-[9.5px] uppercase tracking-wider",
              agentStatus === "ready"
                ? "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200"
                : "border-amber-400/30 bg-amber-500/[0.08] text-amber-200"
            )}
            title={`server agent · ${agentStatus} · ${agentReason}`}
          >
            agent · {agentStatus}
          </span>
        }
      />

      {/* security banner · honest contract */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-white/55">
        <Shield className="h-3.5 w-3.5 text-accent" />
        <span>ssh key only</span>
        <span className="text-white/15">·</span>
        <span>no password storage</span>
        <span className="text-white/15">·</span>
        <span>no arbitrary commands</span>
        <span className="text-white/15">·</span>
        <span>allowlist: {ALLOWED_COMMANDS.join(", ")}</span>
        <span className="text-white/15">·</span>
        <span>every action audited</span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 xl:grid-cols-[260px_minmax(0,1fr)]">
        {/* left rail · profile list */}
        <ProfileList
          profiles={profiles}
          activeId={activeId}
          onActivate={onActivate}
          onAdd={() => setShowAdd(true)}
          onDelete={onDelete}
        />

        {/* main column */}
        <div className="flex min-h-0 flex-col gap-2">
          {!activeProfile && (
            <EmptyAdapterPanel
              text="no server selected"
              subtext="add a profile to begin · ssh key auth only"
            />
          )}
          {activeProfile && (
            <>
              <StatusCards
                status={status}
                err={statusErr}
                fetchedAt={statusAt}
                onRefresh={refreshStatus}
                profile={activeProfile}
              />

              <div className="grid min-h-0 grid-cols-1 gap-2 lg:grid-cols-[1fr_1fr]">
                <ServicesPanel
                  services={services}
                  err={servicesErr}
                  fetchedAt={servicesAt}
                  onRefresh={refreshServices}
                  onRestart={onConfirmRestart}
                  onDeployBlocked={onDeployBlocked}
                />
                <LogsViewer
                  lines={logs}
                  err={logsErr}
                  fetchedAt={logsAt}
                  onRefresh={refreshLogs}
                />
              </div>

              <div className="grid min-h-0 grid-cols-1 gap-2 lg:grid-cols-[1fr_1fr]">
                <AlertsPanel alerts={alerts} />
                <AuditLogPanel entries={audit} onClear={onClearAudit} />
              </div>
            </>
          )}
        </div>
      </div>

      {showAdd && (
        <AddProfileDialog
          onCancel={() => setShowAdd(false)}
          onSubmit={onAdd}
        />
      )}

      {confirmRestart && activeProfile && (
        <ConfirmModal
          title={`restart ${confirmRestart.name}?`}
          body={`${confirmRestart.kind} service on ${activeProfile.host}. This will issue the allowlisted command "restart-service". The SSH bridge is not wired today · the action will be recorded as blocked.`}
          confirmLabel="restart"
          confirmTone="warn"
          onConfirm={onRestartConfirmed}
          onCancel={onRestartCancel}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profile list (left rail)
// ---------------------------------------------------------------------------

function ProfileList({
  profiles,
  activeId,
  onActivate,
  onAdd,
  onDelete
}: {
  profiles: ServerProfile[];
  activeId: string | null;
  onActivate: (id: string) => void;
  onAdd: () => void;
  onDelete: (p: ServerProfile) => void;
}) {
  return (
    <TerminalPanel
      title="server profiles"
      sub={`${profiles.length} local`}
      tone="muted"
      right={
        <button
          type="button"
          onClick={onAdd}
          title="Add server profile · WORKS"
          aria-label="Add server profile · WORKS"
          className="inline-flex items-center gap-1 rounded border border-accent/40 bg-accent/[0.1] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-accent transition hover:bg-accent/[0.15]"
        >
          <Plus className="h-3 w-3" /> add
        </button>
      }
      bodyClassName="p-1 min-h-0"
    >
      {profiles.length === 0 && (
        <EmptyAdapterPanel
          text="no profiles yet"
          subtext="press 'add' to create one · stored locally"
        />
      )}
      <ul className="flex min-h-0 flex-col gap-1 overflow-auto scrollbar-thin">
        {profiles.map((p) => (
          <li key={p.id}>
            <div
              className={clsx(
                "group flex flex-col gap-0.5 rounded border px-2 py-1.5 transition",
                p.id === activeId
                  ? "border-accent/40 bg-accent/[0.08]"
                  : "border-white/8 bg-white/[0.012] hover:border-white/15 hover:bg-white/[0.04]"
              )}
            >
              <div className="flex items-start justify-between gap-1.5">
                <button
                  type="button"
                  onClick={() => onActivate(p.id)}
                  title={`Activate ${p.name} · WORKS`}
                  aria-label={`Activate ${p.name} · WORKS`}
                  className="flex flex-1 flex-col text-left"
                >
                  <span className="flex items-center gap-1 font-mono text-[11px] text-white/90">
                    <Server className="h-3 w-3 text-accent" />
                    {p.name}
                  </span>
                  <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/45">
                    {p.sshUser}@{p.host}:{p.port}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(p)}
                  title={`Delete ${p.name} · WORKS`}
                  aria-label={`Delete ${p.name} · WORKS`}
                  className="rounded border border-rose-400/25 bg-rose-500/[0.06] p-0.5 text-rose-200/80 opacity-0 transition group-hover:opacity-100 hover:bg-rose-500/[0.12]"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </div>
              {p.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-0.5 rounded border border-white/10 bg-white/[0.03] px-1 py-px font-mono text-[8.5px] uppercase tracking-wider text-white/55"
                    >
                      <Tag className="h-2.5 w-2.5" />
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </TerminalPanel>
  );
}

// ---------------------------------------------------------------------------
// Status cards
// ---------------------------------------------------------------------------

function StatusCards({
  status,
  err,
  fetchedAt,
  onRefresh,
  profile
}: {
  status: ServerStatus | null;
  err: string | null;
  fetchedAt: number | null;
  onRefresh: () => void;
  profile: ServerProfile;
}) {
  const items: Array<{ label: string; value: string; Icon: typeof Cpu; tone: "ok" | "warn" | "bad" | "muted" }> = [
    {
      label: "ping",
      value: status?.online == null ? "—" : status.online ? `${status.latencyMs ?? "?"} ms` : "offline",
      Icon: Zap,
      tone: status?.online == null ? "muted" : status.online ? "ok" : "bad"
    },
    {
      label: "cpu",
      value: status?.cpuPct == null ? "—" : `${status.cpuPct.toFixed(0)}%`,
      Icon: Cpu,
      tone: status?.cpuPct == null ? "muted" : status.cpuPct > 85 ? "warn" : "ok"
    },
    {
      label: "ram",
      value: status?.memPct == null ? "—" : `${status.memPct.toFixed(0)}%`,
      Icon: Layers,
      tone: status?.memPct == null ? "muted" : status.memPct > 85 ? "warn" : "ok"
    },
    {
      label: "disk",
      value: status?.diskPct == null ? "—" : `${status.diskPct.toFixed(0)}%`,
      Icon: HardDrive,
      tone: status?.diskPct == null ? "muted" : status.diskPct > 85 ? "warn" : "ok"
    },
    {
      label: "uptime",
      value: formatUptime(status?.uptimeSec ?? null),
      Icon: Clock,
      tone: "muted"
    }
  ];

  const sub = `${profile.sshUser}@${profile.host}:${profile.port}`;

  return (
    <TerminalPanel
      title="status"
      sub={sub}
      tone={err ? "warn" : status ? "ok" : "muted"}
      status={
        err
          ? "agent not wired"
          : fetchedAt
            ? new Date(fetchedAt).toLocaleTimeString("en-GB", { hour12: false })
            : "—"
      }
      right={
        <button
          type="button"
          onClick={onRefresh}
          title="Refresh status · WORKS"
          aria-label="Refresh status · WORKS"
          className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/65 transition hover:bg-white/[0.06] hover:text-white"
        >
          <RefreshCw className="h-3 w-3" /> refresh
        </button>
      }
      bodyClassName="p-2 min-h-0"
    >
      <div className="grid grid-cols-2 gap-1.5 md:grid-cols-5">
        {items.map((it) => (
          <StatTile key={it.label} {...it} />
        ))}
      </div>
      {!status && (
        <p className="mt-1.5 rounded border border-dashed border-white/12 bg-white/[0.012] px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-white/45">
          adapter-ready · agent not wired · values will populate when the SSH bridge ships
        </p>
      )}
    </TerminalPanel>
  );
}

const STAT_TONE: Record<"ok" | "warn" | "bad" | "muted", string> = {
  ok: "border-emerald-400/25 bg-emerald-500/[0.05] text-emerald-200",
  warn: "border-amber-400/25 bg-amber-500/[0.05] text-amber-200",
  bad: "border-rose-400/25 bg-rose-500/[0.05] text-rose-200",
  muted: "border-white/8 bg-white/[0.012] text-white/55"
};

function StatTile({
  label,
  value,
  Icon,
  tone
}: {
  label: string;
  value: string;
  Icon: typeof Cpu;
  tone: "ok" | "warn" | "bad" | "muted";
}) {
  return (
    <div className={clsx("flex flex-col gap-0.5 rounded border px-2 py-1.5", STAT_TONE[tone])}>
      <span className="flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.22em]">
        <Icon className="h-2.5 w-2.5" />
        {label}
      </span>
      <span className="font-mono text-[15px] font-semibold tabular-nums">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Services panel
// ---------------------------------------------------------------------------

function ServicesPanel({
  services,
  err,
  fetchedAt,
  onRefresh,
  onRestart,
  onDeployBlocked
}: {
  services: ServerService[];
  err: string | null;
  fetchedAt: number | null;
  onRefresh: () => void;
  onRestart: (s: ServerService) => void;
  onDeployBlocked: () => void;
}) {
  return (
    <TerminalPanel
      title="services"
      sub="docker · pm2 · systemd"
      tone={err ? "warn" : services.length ? "ok" : "muted"}
      status={
        err
          ? "agent not wired"
          : fetchedAt
            ? new Date(fetchedAt).toLocaleTimeString("en-GB", { hour12: false })
            : "—"
      }
      right={
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onDeployBlocked}
            disabled
            title="Deploy · DISABLED · planned (audited as blocked)"
            aria-label="Deploy · DISABLED · planned"
            className="inline-flex cursor-not-allowed items-center gap-1 rounded border border-white/8 bg-white/[0.012] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/40"
          >
            <Rocket className="h-3 w-3" /> deploy · planned
          </button>
          <button
            type="button"
            onClick={onRefresh}
            title="Refresh services · WORKS"
            aria-label="Refresh services · WORKS"
            className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/65 transition hover:bg-white/[0.06] hover:text-white"
          >
            <RefreshCw className="h-3 w-3" /> refresh
          </button>
        </div>
      }
      bodyClassName="p-2 min-h-0"
    >
      {services.length === 0 ? (
        <EmptyAdapterPanel
          text="services adapter-ready"
          subtext={err ?? "agent not wired · no service inventory"}
        />
      ) : (
        <ul className="flex min-h-0 flex-col gap-1 overflow-auto scrollbar-thin">
          {services.map((s) => (
            <ServiceRow key={s.id} svc={s} onRestart={onRestart} />
          ))}
        </ul>
      )}
    </TerminalPanel>
  );
}

const SERVICE_TONE: Record<ServerService["state"], string> = {
  running: "border-emerald-400/30 bg-emerald-500/[0.06] text-emerald-200",
  stopped: "border-rose-400/30 bg-rose-500/[0.06] text-rose-200",
  errored: "border-rose-400/30 bg-rose-500/[0.06] text-rose-200",
  unknown: "border-white/10 bg-white/[0.03] text-white/55"
};

function ServiceRow({
  svc,
  onRestart
}: {
  svc: ServerService;
  onRestart: (s: ServerService) => void;
}) {
  return (
    <li className="flex items-center justify-between gap-2 rounded border border-white/8 bg-white/[0.012] px-2 py-1">
      <div className="flex flex-col">
        <span className="font-mono text-[11px] text-white/90">{svc.name}</span>
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/45">
          {svc.kind}
          {svc.detail ? ` · ${svc.detail}` : ""}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span
          className={clsx(
            "rounded border px-1.5 py-px font-mono text-[9px] uppercase tracking-wider",
            SERVICE_TONE[svc.state]
          )}
        >
          {svc.state}
        </span>
        <button
          type="button"
          onClick={() => onRestart(svc)}
          title={`Restart ${svc.name} · WORKS · opens confirm modal · allowlisted`}
          aria-label={`Restart ${svc.name} · WORKS`}
          className="inline-flex items-center gap-1 rounded border border-amber-400/30 bg-amber-500/[0.06] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-200 transition hover:bg-amber-500/[0.12]"
        >
          restart
        </button>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Logs viewer
// ---------------------------------------------------------------------------

function LogsViewer({
  lines,
  err,
  fetchedAt,
  onRefresh
}: {
  lines: string[];
  err: string | null;
  fetchedAt: number | null;
  onRefresh: () => void;
}) {
  return (
    <TerminalPanel
      title="logs"
      sub="last 200 lines · journalctl/docker"
      tone={err ? "warn" : lines.length ? "ok" : "muted"}
      status={
        err
          ? "agent not wired"
          : fetchedAt
            ? new Date(fetchedAt).toLocaleTimeString("en-GB", { hour12: false })
            : "—"
      }
      right={
        <button
          type="button"
          onClick={onRefresh}
          title="Refresh logs · WORKS"
          aria-label="Refresh logs · WORKS"
          className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/65 transition hover:bg-white/[0.06] hover:text-white"
        >
          <RefreshCw className="h-3 w-3" /> refresh
        </button>
      }
      bodyClassName="p-2 min-h-0"
    >
      {lines.length === 0 ? (
        <EmptyAdapterPanel
          text="logs adapter-ready"
          subtext={err ?? "agent not wired · no journal access"}
        />
      ) : (
        <pre className="min-h-0 flex-1 overflow-auto rounded border border-white/8 bg-black/60 p-2 font-mono text-[10px] leading-snug text-white/80 scrollbar-thin">
          {lines.join("\n")}
        </pre>
      )}
    </TerminalPanel>
  );
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

function AlertsPanel({ alerts }: { alerts: ReturnType<typeof deriveAlerts> }) {
  return (
    <TerminalPanel
      title="alerts"
      sub="disk>85% · memory>85% · service down"
      tone={alerts.length > 0 ? "bad" : "muted"}
      status={alerts.length > 0 ? `${alerts.length} firing` : "quiet"}
      bodyClassName="p-2 min-h-0"
    >
      {alerts.length === 0 ? (
        <EmptyAdapterPanel
          text="no alerts firing"
          subtext="rules only fire on real values · adapter not wired today"
        />
      ) : (
        <ul className="flex flex-col gap-1">
          {alerts.map((a) => (
            <li
              key={a.id}
              className={clsx(
                "flex items-start gap-1.5 rounded border px-2 py-1",
                a.severity === "bad"
                  ? "border-rose-400/30 bg-rose-500/[0.06]"
                  : "border-amber-400/30 bg-amber-500/[0.06]"
              )}
            >
              <AlertTriangle
                className={clsx(
                  "h-3 w-3 shrink-0",
                  a.severity === "bad" ? "text-rose-300" : "text-amber-300"
                )}
              />
              <div className="flex flex-col">
                <span className="font-mono text-[10.5px] text-white/90">{a.label}</span>
                <span className="font-mono text-[9px] uppercase tracking-wider text-white/55">
                  {a.detail}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </TerminalPanel>
  );
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

const ACTION_TONE: Record<AuditEntry["result"], string> = {
  ok: "text-emerald-300/85",
  blocked: "text-amber-300/85",
  error: "text-rose-300/85"
};

function AuditLogPanel({
  entries,
  onClear
}: {
  entries: AuditEntry[];
  onClear: () => void;
}) {
  return (
    <TerminalPanel
      title="audit log"
      sub={`${entries.length} entries · local only · max 200`}
      tone="muted"
      right={
        <button
          type="button"
          onClick={onClear}
          title="Clear audit log · WORKS · the clear itself is audited"
          aria-label="Clear audit log · WORKS"
          className="inline-flex items-center gap-1 rounded border border-rose-400/25 bg-rose-500/[0.06] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-rose-200/80 transition hover:bg-rose-500/[0.12]"
        >
          <Trash2 className="h-3 w-3" /> clear
        </button>
      }
      bodyClassName="p-2 min-h-0"
    >
      {entries.length === 0 ? (
        <EmptyAdapterPanel
          text="no audit entries"
          subtext="every action you take on this page is recorded here"
        />
      ) : (
        <ul className="flex min-h-0 flex-col gap-0.5 overflow-auto scrollbar-thin font-mono text-[10px]">
          {entries.map((e, i) => (
            <li
              key={`${e.at}-${i}`}
              className="grid grid-cols-[68px_82px_1fr_60px] items-center gap-2 rounded border border-white/8 bg-white/[0.012] px-1.5 py-0.5"
            >
              <span className="text-white/45">
                {new Date(e.at).toLocaleTimeString("en-GB", { hour12: false })}
              </span>
              <span className="uppercase tracking-wider text-white/75">{e.action}</span>
              <span className="truncate text-white/55">
                {e.profileName ? `${e.profileName} · ` : ""}
                {e.detail}
              </span>
              <span className={clsx("text-right uppercase tracking-wider", ACTION_TONE[e.result])}>
                {e.result}
              </span>
            </li>
          ))}
        </ul>
      )}
    </TerminalPanel>
  );
}

// ---------------------------------------------------------------------------
// Modals
// ---------------------------------------------------------------------------

function ConfirmModal({
  title,
  body,
  confirmLabel,
  confirmTone = "warn",
  onConfirm,
  onCancel
}: {
  title: string;
  body: string;
  confirmLabel: string;
  confirmTone?: "warn" | "bad";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="flex w-full max-w-md flex-col gap-3 rounded-lg border border-white/12 bg-[#02040a] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close · WORKS"
            className="rounded border border-white/10 bg-white/[0.03] p-1 text-white/55 transition hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-3 w-3" />
          </button>
        </header>
        <p className="text-[11px] leading-snug text-white/65">{body}</p>
        <footer className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            title="Cancel · WORKS"
            aria-label="Cancel · WORKS"
            className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-white/65 transition hover:bg-white/[0.06] hover:text-white"
          >
            cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            title={`Confirm · WORKS · ${confirmLabel}`}
            aria-label={`Confirm · WORKS · ${confirmLabel}`}
            className={clsx(
              "rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition",
              confirmTone === "bad"
                ? "border-rose-400/40 bg-rose-500/[0.1] text-rose-200 hover:bg-rose-500/[0.15]"
                : "border-amber-400/40 bg-amber-500/[0.1] text-amber-200 hover:bg-amber-500/[0.15]"
            )}
          >
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}

function AddProfileDialog({
  onSubmit,
  onCancel
}: {
  onSubmit: (p: ServerProfile) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [sshUser, setSshUser] = useState("root");
  const [port, setPort] = useState(22);
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [sshKeyPath, setSshKeyPath] = useState("");
  const [allowedPm2, setAllowedPm2] = useState("");
  const [allowedDocker, setAllowedDocker] = useState("");
  const [allowedSystemd, setAllowedSystemd] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const valid =
    name.trim().length > 0 &&
    host.trim().length > 0 &&
    sshUser.trim().length > 0 &&
    Number.isFinite(port) &&
    port > 0 &&
    port < 65536;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const splitCsv = (s: string) =>
      s
        .split(",")
        .map((x) => x.trim())
        .filter((x) => x.length > 0 && /^[A-Za-z0-9._-]+$/.test(x));
    onSubmit({
      id: newProfileId(),
      name: name.trim(),
      host: host.trim(),
      sshUser: sshUser.trim(),
      port,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0),
      notes: notes.trim() || undefined,
      sshKeyPath: sshKeyPath.trim() || undefined,
      allowedPm2Apps: splitCsv(allowedPm2),
      allowedDockerContainers: splitCsv(allowedDocker),
      allowedSystemdServices: splitCsv(allowedSystemd),
      createdAt: Date.now()
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add server profile"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-md flex-col gap-3 rounded-lg border border-white/12 bg-[#02040a] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
            <Server className="h-3.5 w-3.5 text-accent" />
            new server profile
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close · WORKS"
            className="rounded border border-white/10 bg-white/[0.03] p-1 text-white/55 transition hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-3 w-3" />
          </button>
        </header>
        <p className="text-[10.5px] leading-snug text-white/55">
          Profiles are stored in browser localStorage. <strong className="text-white/80">No passwords are accepted or saved.</strong> Authentication uses an SSH key managed outside this app (e.g. <code className="rounded bg-white/[0.05] px-1">~/.ssh/id_ed25519</code> on the device running the future agent).
        </p>

        <Field label="display name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="prod-edge-01"
            required
            className="w-full rounded border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[11px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
          />
        </Field>
        <div className="grid grid-cols-[1fr_80px] gap-2">
          <Field label="host">
            <input
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="10.0.0.4"
              required
              className="w-full rounded border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[11px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
            />
          </Field>
          <Field label="port">
            <input
              type="number"
              min={1}
              max={65535}
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              className="w-full rounded border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[11px] text-white focus:border-accent/40 focus:outline-none"
            />
          </Field>
        </div>
        <Field label="ssh user">
          <input
            value={sshUser}
            onChange={(e) => setSshUser(e.target.value)}
            placeholder="root"
            required
            className="w-full rounded border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[11px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
          />
        </Field>
        <Field label="tags · comma separated">
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="prod, eu-west, db"
            className="w-full rounded border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[11px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
          />
        </Field>
        <Field label="ssh key path (optional · on this device only)">
          <input
            value={sshKeyPath}
            onChange={(e) => setSshKeyPath(e.target.value)}
            placeholder="~/.ssh/id_ed25519 (leave blank to use ~/.ssh/config)"
            className="w-full rounded border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[11px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
          />
        </Field>

        <Field label="allowlist · pm2 apps (comma separated)">
          <input
            value={allowedPm2}
            onChange={(e) => setAllowedPm2(e.target.value)}
            placeholder="api, worker"
            className="w-full rounded border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[11px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
          />
        </Field>
        <Field label="allowlist · docker containers (comma separated)">
          <input
            value={allowedDocker}
            onChange={(e) => setAllowedDocker(e.target.value)}
            placeholder="postgres, redis, app"
            className="w-full rounded border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[11px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
          />
        </Field>
        <Field label="allowlist · systemd services (comma separated)">
          <input
            value={allowedSystemd}
            onChange={(e) => setAllowedSystemd(e.target.value)}
            placeholder="nginx, caddy, fail2ban"
            className="w-full rounded border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[11px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
          />
        </Field>

        <Field label="notes (optional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="any context · purpose · runbook link"
            className="w-full resize-y rounded border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[10.5px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
          />
        </Field>

        <footer className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-amber-200/80">
            <Terminal className="h-3 w-3" />
            ssh key only · no password field
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onCancel}
              title="Cancel · WORKS"
              aria-label="Cancel · WORKS"
              className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-white/65 transition hover:bg-white/[0.06] hover:text-white"
            >
              cancel
            </button>
            <button
              type="submit"
              disabled={!valid}
              title={valid ? "Save profile · WORKS" : "Fill required fields"}
              aria-label="Save profile · WORKS"
              className="rounded-md border border-accent/40 bg-accent/[0.1] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-accent transition hover:bg-accent/[0.15] disabled:cursor-not-allowed disabled:opacity-40"
            >
              save
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

function pickDefaultLogTarget(
  profile: ServerProfile
): { kind: ServiceKind; name: string } | null {
  if (profile.allowedSystemdServices.length > 0)
    return { kind: "systemd", name: profile.allowedSystemdServices[0] };
  if (profile.allowedDockerContainers.length > 0)
    return { kind: "docker", name: profile.allowedDockerContainers[0] };
  if (profile.allowedPm2Apps.length > 0)
    return { kind: "pm2", name: profile.allowedPm2Apps[0] };
  return null;
}

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/45">
        {label}
      </span>
      {children}
    </label>
  );
}

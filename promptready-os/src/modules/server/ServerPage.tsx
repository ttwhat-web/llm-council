"use client";

/**
 * Server Command Center.
 *
 * The SSH bridge (services/serverAgentBridge.ts → the Rust server.rs
 * command) is real and wired — status / services / logs are live data
 * when running in the desktop app. Restart flows through the same
 * Action Queue every other executor uses (services/executors/
 * computerUseExecutor.ts, capability "terminal") so it gets a real
 * receipt and a real Timeline entry, not just a local toast; the
 * confirm modal below is the founder decision the queue's approval
 * step formalizes. Deploy is permanently disabled with the "planned"
 * pill — no button exists that isn't actually wired to something real.
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
  Pencil,
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
import { useActionQueue, COMPUTER_USE_EXECUTOR_ID, type ComputerUseParams } from "@/services/executors";

// Local alias so the existing rendering code keeps a single ServerService type.
type ServerService = BridgeServiceOut;

interface RestartHint {
  state: "running" | "ok" | "error";
  at: number;
  detail?: string;
}

// ---------------------------------------------------------------------------
// page
// ---------------------------------------------------------------------------

export default function ServerPage() {
  const [profiles, setProfiles] = useState<ServerProfile[]>(() => listProfiles());
  const [activeId, setActiveIdState] = useState<string | null>(() => getActiveProfileId());
  const [showAdd, setShowAdd] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ServerProfile | null>(null);
  const [confirmRestart, setConfirmRestart] = useState<ServerService | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>(() => listAudit());
  const [lastRestart, setLastRestart] = useState<Record<string, RestartHint>>({});
  // Tracks the one restart currently flowing through the Action Queue,
  // so its real outcome (not a local toast) drives lastRestart below.
  const [inFlightRestart, setInFlightRestart] = useState<{ queueId: string; serviceId: string } | null>(null);
  const inFlightItem = useActionQueue((s) => (inFlightRestart ? s.items[inFlightRestart.queueId] : undefined));

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
  const canUseSsh = bridgeOn && agentStatus === "ready";
  const sshUnavailableReason = bridgeOn
    ? "SSH bridge is not ready in this desktop runtime"
    : "Desktop app required for SSH operations";
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

  const onEdit = (p: ServerProfile) => {
    const next = upsertProfile(p);
    setProfiles(next);
    setEditingProfile(null);
    recordAudit({
      action: "profile-edit",
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
    if (!canUseSsh) {
      setStatus(null);
      setStatusErr(sshUnavailableReason);
      setStatusAt(Date.now());
      return;
    }
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
    if (!canUseSsh) {
      setServices([]);
      setServicesErr(sshUnavailableReason);
      setServicesAt(Date.now());
      return;
    }
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
    if (!canUseSsh) {
      setLogs([]);
      setLogsErr(sshUnavailableReason);
      setLogsAt(Date.now());
      return;
    }
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
    if (!activeProfile || !canUseSsh) return;
    void refreshStatus();
    void refreshServices();
    void refreshLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile?.id, canUseSsh]);

  const alerts = useMemo(() => deriveAlerts(status, services), [status, services]);

  const onConfirmRestart = (svc: ServerService) => {
    setConfirmRestart(svc);
  };

  // Restart flows through the real Action Queue (computerUseExecutor,
  // capability "terminal") instead of calling the SSH bridge directly —
  // same underlying call, but now it earns a receipt and a Timeline
  // entry like every other action in the product. The confirm modal
  // below is still the one moment the founder actually decides;
  // approve() here formalizes a decision already given, it doesn't
  // skip one.
  const onRestartConfirmed = () => {
    if (!confirmRestart || !activeProfile) return;
    const svc = confirmRestart;
    setConfirmRestart(null);
    const rid = svc.id;
    if (!canUseSsh) {
      setLastRestart((prev) => ({
        ...prev,
        [rid]: { state: "error", at: Date.now(), detail: sshUnavailableReason }
      }));
      recordAudit({
        action: "restart-confirm",
        profileId: activeProfile.id,
        profileName: activeProfile.name,
        detail: `service=${svc.name} · ${sshUnavailableReason}`,
        result: "blocked"
      });
      return;
    }
    setLastRestart((prev) => ({ ...prev, [rid]: { state: "running", at: Date.now() } }));
    recordAudit({
      action: "restart-confirm",
      profileId: activeProfile.id,
      profileName: activeProfile.name,
      detail: `service=${svc.name}`,
      result: "ok"
    });

    const queueId = `${COMPUTER_USE_EXECUTOR_ID}:${activeProfile.id}:${svc.kind}:${svc.name}`;
    const params: ComputerUseParams = {
      capability: "terminal",
      summary: `Restart ${svc.name}`,
      target: `${activeProfile.host} · ${svc.kind}:${svc.name}`,
      terminal: { profile: activeProfile, kind: svc.kind, serviceName: svc.name }
    };
    const { detect, prepare, approve } = useActionQueue.getState();
    detect({ id: queueId, executor: COMPUTER_USE_EXECUTOR_ID, title: params.summary, description: params.target });
    prepare({ id: queueId, executor: COMPUTER_USE_EXECUTOR_ID, params });
    setInFlightRestart({ queueId, serviceId: rid });
    approve(queueId);
  };

  // Reflects the queue's real, settled outcome into the existing
  // lastRestart UI feed — never a second call to the bridge, just
  // reading back what the executor already did for real.
  useEffect(() => {
    if (!inFlightRestart || !inFlightItem) return;
    if (inFlightItem.status !== "completed" && inFlightItem.status !== "failed") return;
    const rid = inFlightRestart.serviceId;
    setLastRestart((prev) => ({
      ...prev,
      [rid]:
        inFlightItem.status === "completed"
          ? { state: "ok", at: Date.now(), detail: inFlightItem.receipt ?? "restarted" }
          : { state: "error", at: Date.now(), detail: inFlightItem.error ?? "unknown error" }
    }));
    setAudit(listAudit());
    setInFlightRestart(null);
    if (inFlightItem.status === "completed") void refreshServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inFlightRestart, inFlightItem?.status]);

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
    <div className="mx-auto flex h-full w-full max-w-[1700px] flex-col gap-1.5 px-2 py-2">
      {/* compact single-row command bar · replaces the marketing header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-white/10 bg-white/[0.012] px-2 py-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent">
          server · command center
        </span>
        <Divider />
        <span className="inline-flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-wider text-white/60">
          <Shield className="h-3 w-3 text-accent" />
          ssh key only
          <span className="text-white/25">·</span>
          no password
          <span className="text-white/25">·</span>
          no arbitrary commands
        </span>
        <Divider />
        <span
          className="font-mono text-[9px] uppercase tracking-wider text-white/45"
          title={`allowlist: ${ALLOWED_COMMANDS.join(", ")}`}
        >
          allowlist · audited
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5">
          <span
            className={clsx(
              "rounded border px-1.5 py-px font-mono text-[9px] uppercase tracking-wider",
              agentStatus === "ready"
                ? "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200"
                : "border-amber-400/30 bg-amber-500/[0.08] text-amber-200"
            )}
            title={`server agent · ${agentStatus} · ${agentReason}`}
          >
            agent · {agentStatus}
          </span>
          <span className="hidden max-w-[240px] truncate font-mono text-[9px] uppercase tracking-wider text-white/40 md:inline">
            {agentReason}
          </span>
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 xl:grid-cols-[260px_minmax(0,1fr)]">
        {/* left rail · profile list */}
        <ProfileList
          profiles={profiles}
          activeId={activeId}
          onActivate={onActivate}
          onAdd={() => setShowAdd(true)}
          onEdit={setEditingProfile}
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
                canUseSsh={canUseSsh}
                disabledReason={sshUnavailableReason}
              />

              <div className="grid min-h-0 grid-cols-1 gap-2 lg:grid-cols-[1fr_1fr]">
                <ServicesPanel
                  services={services}
                  err={servicesErr}
                  fetchedAt={servicesAt}
                  onRefresh={refreshServices}
                  onRestart={onConfirmRestart}
                  onDeployBlocked={onDeployBlocked}
                  lastRestart={lastRestart}
                  canUseSsh={canUseSsh}
                  disabledReason={sshUnavailableReason}
                />
                <LogsViewer
                  lines={logs}
                  err={logsErr}
                  fetchedAt={logsAt}
                  onRefresh={refreshLogs}
                  canUseSsh={canUseSsh}
                  disabledReason={sshUnavailableReason}
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

      {editingProfile && (
        <AddProfileDialog
          key={editingProfile.id}
          initial={editingProfile}
          onCancel={() => setEditingProfile(null)}
          onSubmit={onEdit}
        />
      )}

      {confirmRestart && activeProfile && (
        <ConfirmModal
          title={`restart ${confirmRestart.name}?`}
          body={`${confirmRestart.kind} service on ${activeProfile.host}. This issues only the allowlisted command "restart-service" through the desktop SSH bridge.`}
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
  onEdit,
  onDelete
}: {
  profiles: ServerProfile[];
  activeId: string | null;
  onActivate: (id: string) => void;
  onAdd: () => void;
  onEdit: (p: ServerProfile) => void;
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
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(p)}
                    title={`Edit ${p.name} · WORKS`}
                    aria-label={`Edit ${p.name} · WORKS`}
                    className="rounded border border-white/10 bg-white/[0.025] p-0.5 text-white/55 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    <Pencil className="h-2.5 w-2.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(p)}
                    title={`Delete ${p.name} · WORKS`}
                    aria-label={`Delete ${p.name} · WORKS`}
                    className="rounded border border-rose-400/25 bg-rose-500/[0.06] p-0.5 text-rose-200/80 transition hover:bg-rose-500/[0.12]"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>
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
  profile,
  canUseSsh,
  disabledReason
}: {
  status: ServerStatus | null;
  err: string | null;
  fetchedAt: number | null;
  onRefresh: () => void;
  profile: ServerProfile;
  canUseSsh: boolean;
  disabledReason: string;
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
          ? "error"
          : fetchedAt
            ? new Date(fetchedAt).toLocaleTimeString("en-GB", { hour12: false })
            : "—"
      }
      right={
        <button
          type="button"
          onClick={onRefresh}
          disabled={!canUseSsh}
          title={canUseSsh ? "Refresh status · WORKS" : `Refresh status · DISABLED · ${disabledReason}`}
          aria-label={canUseSsh ? "Refresh status · WORKS" : `Refresh status · DISABLED · ${disabledReason}`}
          className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/65 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
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
      {!canUseSsh && (
        <InlineUnavailable
          label="desktop required"
          detail={`${disabledReason}. Profiles are local, but status probes require the Tauri SSH bridge.`}
        />
      )}
      {err && <InlineError label="probe-status failed" detail={err} />}
      {canUseSsh && !status && !err && (
        <p className="mt-1.5 rounded border border-dashed border-white/12 bg-white/[0.012] px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-white/45">
          ready to probe through the desktop SSH bridge
        </p>
      )}
    </TerminalPanel>
  );
}

function InlineError({ label, detail }: { label: string; detail: string }) {
  return (
    <div
      role="alert"
      className="mt-1 flex items-center gap-1.5 rounded border border-rose-400/30 bg-rose-500/[0.06] px-1.5 py-1"
    >
      <AlertTriangle className="h-3 w-3 shrink-0 text-rose-300" />
      <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.22em] text-rose-200">
        {label}
      </span>
      <span className="min-w-0 truncate font-mono text-[10.5px] text-white/80">{detail}</span>
    </div>
  );
}

function InlineUnavailable({ label, detail }: { label: string; detail: string }) {
  return (
    <div
      role="status"
      className="mt-1 flex items-center gap-1.5 rounded border border-amber-400/30 bg-amber-500/[0.06] px-1.5 py-1"
    >
      <AlertTriangle className="h-3 w-3 shrink-0 text-amber-300" />
      <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.22em] text-amber-200">
        {label}
      </span>
      <span className="min-w-0 truncate font-mono text-[10.5px] text-white/80">{detail}</span>
    </div>
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
    <div className={clsx("flex items-center justify-between gap-2 rounded border px-2 py-1.5", STAT_TONE[tone])}>
      <span className="flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.22em] text-white/55">
        <Icon className="h-2.5 w-2.5" />
        {label}
      </span>
      <span className="font-mono text-[16px] font-semibold leading-none tabular-nums">{value}</span>
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
  onDeployBlocked,
  lastRestart,
  canUseSsh,
  disabledReason
}: {
  services: ServerService[];
  err: string | null;
  fetchedAt: number | null;
  onRefresh: () => void;
  onRestart: (s: ServerService) => void;
  onDeployBlocked: () => void;
  lastRestart: Record<string, RestartHint>;
  canUseSsh: boolean;
  disabledReason: string;
}) {
  return (
    <TerminalPanel
      title="services"
      sub="docker · pm2 · systemd"
      tone={err ? "warn" : services.length ? "ok" : "muted"}
      status={
        err
          ? "error"
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
            title="Deploy · DISABLED · deployment is not implemented"
            aria-label="Deploy · DISABLED · planned"
            className="inline-flex cursor-not-allowed items-center gap-1 rounded border border-white/8 bg-white/[0.012] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/40"
          >
            <Rocket className="h-3 w-3" /> deploy · planned
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={!canUseSsh}
            title={canUseSsh ? "Refresh services · WORKS" : `Refresh services · DISABLED · ${disabledReason}`}
            aria-label={canUseSsh ? "Refresh services · WORKS" : `Refresh services · DISABLED · ${disabledReason}`}
            className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/65 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCw className="h-3 w-3" /> refresh
          </button>
        </div>
      }
      bodyClassName="p-2 min-h-0"
    >
      {!canUseSsh && (
        <InlineUnavailable
          label="desktop required"
          detail={`${disabledReason}. Service inventory and restart use allowlisted SSH commands.`}
        />
      )}
      {services.length === 0 ? (
        canUseSsh && err ? (
          <InlineError label="services failed" detail={err} />
        ) : (
          <EmptyAdapterPanel
            text={canUseSsh ? "no services loaded" : "services unavailable in browser"}
            subtext={canUseSsh ? "refresh to probe docker · pm2 · systemd" : disabledReason}
          />
        )
      ) : (
        <ul className="flex min-h-0 flex-col gap-1 overflow-auto scrollbar-thin">
          {services.map((s) => (
            <ServiceRow
              key={s.id}
              svc={s}
              onRestart={onRestart}
              hint={lastRestart[s.id] ?? null}
              canUseSsh={canUseSsh}
              disabledReason={disabledReason}
            />
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
  onRestart,
  hint,
  canUseSsh,
  disabledReason
}: {
  svc: ServerService;
  onRestart: (s: ServerService) => void;
  hint: RestartHint | null;
  canUseSsh: boolean;
  disabledReason: string;
}) {
  const restartDisabled = !canUseSsh || hint?.state === "running";
  const restartTitle = !canUseSsh
    ? `Restart ${svc.name} · DISABLED · ${disabledReason}`
    : hint?.state === "running"
      ? `Restart ${svc.name} · DISABLED · restart already running`
      : `Restart ${svc.name} · WORKS · opens confirm modal · allowlisted`;
  return (
    <li className="flex flex-col gap-1 rounded border border-white/8 bg-white/[0.012] px-2 py-1">
      <div className="flex items-center justify-between gap-2">
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
            disabled={restartDisabled}
            title={restartTitle}
            aria-label={
              restartDisabled
                ? `Restart ${svc.name} · DISABLED · ${!canUseSsh ? disabledReason : "restart already running"}`
                : `Restart ${svc.name} · WORKS`
            }
            className="inline-flex items-center gap-1 rounded border border-white/12 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/75 transition hover:border-amber-400/40 hover:bg-amber-500/[0.08] hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {hint?.state === "running" ? "restarting…" : "restart"}
          </button>
        </div>
      </div>
      {hint && hint.state !== "running" && (
        <RestartHintRow hint={hint} />
      )}
    </li>
  );
}

function RestartHintRow({ hint }: { hint: RestartHint }) {
  const cls =
    hint.state === "ok"
      ? "border-emerald-400/30 bg-emerald-500/[0.05] text-emerald-200"
      : "border-rose-400/30 bg-rose-500/[0.06] text-rose-200";
  return (
    <div
      role="status"
      className={clsx(
        "flex items-center gap-1.5 rounded border px-1.5 py-0.5 font-mono text-[9.5px]",
        cls
      )}
    >
      <span className="shrink-0 uppercase tracking-wider">
        {hint.state === "ok" ? "ok" : "error"}
      </span>
      <span className="shrink-0 uppercase tracking-wider text-white/45 tabular-nums">
        {new Date(hint.at).toLocaleTimeString("en-GB", { hour12: false })}
      </span>
      <span className="min-w-0 truncate text-white/80">{hint.detail}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Logs viewer
// ---------------------------------------------------------------------------

function LogsViewer({
  lines,
  err,
  fetchedAt,
  onRefresh,
  canUseSsh,
  disabledReason
}: {
  lines: string[];
  err: string | null;
  fetchedAt: number | null;
  onRefresh: () => void;
  canUseSsh: boolean;
  disabledReason: string;
}) {
  return (
    <TerminalPanel
      title="logs"
      sub="last 200 lines · journalctl/docker"
      tone={err ? "warn" : lines.length ? "ok" : "muted"}
      status={
        err
          ? "error"
          : fetchedAt
            ? new Date(fetchedAt).toLocaleTimeString("en-GB", { hour12: false })
            : "—"
      }
      right={
        <button
          type="button"
          onClick={onRefresh}
          disabled={!canUseSsh}
          title={canUseSsh ? "Refresh logs · WORKS" : `Refresh logs · DISABLED · ${disabledReason}`}
          aria-label={canUseSsh ? "Refresh logs · WORKS" : `Refresh logs · DISABLED · ${disabledReason}`}
          className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/65 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RefreshCw className="h-3 w-3" /> refresh
        </button>
      }
      bodyClassName="p-2 min-h-0"
    >
      {!canUseSsh && (
        <InlineUnavailable
          label="desktop required"
          detail={`${disabledReason}. Logs are fetched through allowlisted journal/docker/pm2 targets.`}
        />
      )}
      {lines.length === 0 ? (
        canUseSsh && err ? (
          <InlineError label="logs failed" detail={err} />
        ) : (
          <EmptyAdapterPanel
            text={canUseSsh ? "no logs loaded" : "logs unavailable in browser"}
            subtext={canUseSsh ? "refresh to fetch the last 200 lines" : disabledReason}
          />
        )
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
        <div className="flex min-h-0 flex-col overflow-hidden font-mono text-[10px]">
          {/* column header · ties row alignment together */}
          <div className="grid grid-cols-[64px_120px_1fr_60px] items-center gap-2 border-b border-white/10 px-1.5 py-1 font-mono text-[8.5px] uppercase tracking-[0.2em] text-white/35">
            <span>time</span>
            <span>action</span>
            <span>detail</span>
            <span className="text-right">result</span>
          </div>
          <ul className="flex min-h-0 flex-col overflow-auto scrollbar-thin">
            {entries.map((e, i) => (
              <li
                key={`${e.at}-${i}`}
                className={clsx(
                  "grid grid-cols-[64px_120px_1fr_60px] items-center gap-2 border-b border-white/[0.04] px-1.5 py-0.5",
                  i % 2 === 1 && "bg-white/[0.012]"
                )}
              >
                <span className="text-white/45 tabular-nums">
                  {new Date(e.at).toLocaleTimeString("en-GB", { hour12: false })}
                </span>
                <span className="truncate uppercase tracking-wider text-white/80">{e.action}</span>
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
        </div>
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
  initial,
  onSubmit,
  onCancel
}: {
  initial?: ServerProfile;
  onSubmit: (p: ServerProfile) => void;
  onCancel: () => void;
}) {
  const editing = Boolean(initial);
  const [name, setName] = useState(initial?.name ?? "");
  const [host, setHost] = useState(initial?.host ?? "");
  const [sshUser, setSshUser] = useState(initial?.sshUser ?? "root");
  const [port, setPort] = useState(initial?.port ?? 22);
  const [tags, setTags] = useState(initial?.tags.join(", ") ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [sshKeyPath, setSshKeyPath] = useState(initial?.sshKeyPath ?? "");
  const [allowedPm2, setAllowedPm2] = useState(initial?.allowedPm2Apps.join(", ") ?? "");
  const [allowedDocker, setAllowedDocker] = useState(initial?.allowedDockerContainers.join(", ") ?? "");
  const [allowedSystemd, setAllowedSystemd] = useState(initial?.allowedSystemdServices.join(", ") ?? "");

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
      id: initial?.id ?? newProfileId(),
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
      createdAt: initial?.createdAt ?? Date.now()
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={editing ? "Edit server profile" : "Add server profile"}
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
            {editing ? "edit server profile" : "new server profile"}
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
              title={valid ? "Save profile · WORKS" : "Save profile · DISABLED · fill required fields"}
              aria-label={valid ? "Save profile · WORKS" : "Save profile · DISABLED · fill required fields"}
              className="rounded-md border border-accent/40 bg-accent/[0.1] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-accent transition hover:bg-accent/[0.15] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {editing ? "save edits" : "save"}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

function Divider() {
  return <span aria-hidden className="hidden h-3 w-px shrink-0 bg-white/10 sm:inline-block" />;
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

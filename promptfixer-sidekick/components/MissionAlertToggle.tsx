"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  Bell,
  Check,
  ExternalLink,
  Loader2,
  Lock,
  RefreshCw,
  Unlink as UnlinkIcon
} from "lucide-react";

/**
 * Pro-only Mission Alerts surface — multi-state.
 *
 *   1. locked         feature flag off              → Pro pill, no controls
 *   2. disconnected   flag on, user has no link     → email field + Connect
 *   3. connecting     code minted, awaiting webhook → code + bot link + check
 *   4. connected      user-chat link exists         → "Connected" + toggle
 *
 * The user identifier is whatever string the user supplies (treated as
 * email/handle until auth lands). It's persisted in PromptFixer's
 * Settings so the user doesn't retype it. Once connected, the toggle
 * for `notifyOnHumanNeeded` appears.
 */

interface Props {
  /** Master feature flag — usually NEXT_PUBLIC_MISSION_ALERTS_ENABLED. */
  unlocked: boolean;
  /** User identifier (email/handle). Persisted by the parent. */
  userEmail: string;
  onUserEmailChange: (next: string) => void;
  /** Soft-alert opt-in. Only meaningful once linked. */
  notifyEnabled: boolean;
  onNotifyChange: (next: boolean) => void;
  compact?: boolean;
}

interface StatusResponse {
  ok: boolean;
  linked: boolean;
  linkedAt?: number;
  chatHint?: string;
  featureEnabled?: boolean;
  hasToken?: boolean;
  hasAdminFallback?: boolean;
}

interface CodeResponse {
  ok: boolean;
  ready?: boolean;
  reason?: string;
  code?: string;
  botUsername?: string;
  expiresAt?: number;
  ttlSeconds?: number;
}

export function MissionAlertToggle({
  unlocked,
  userEmail,
  onUserEmailChange,
  notifyEnabled,
  onNotifyChange,
  compact
}: Props) {
  // ----- LOCKED ----------------------------------------------------------
  if (!unlocked) {
    return (
      <div
        className={clsx(
          "flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2",
          compact && "px-2.5 py-1.5"
        )}
      >
        <span className="flex items-center gap-2 text-white/60">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          <span className="flex flex-col leading-tight">
            <span className="text-[12px] font-medium text-white/80">
              Telegram Mission Alerts
            </span>
            <span className="text-[10px] text-white/45">
              Notify me when a mission needs human action.
            </span>
          </span>
        </span>
        <span className="rounded-md border border-accent/35 bg-accent/[0.1] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.2em] text-accent">
          Pro
        </span>
      </div>
    );
  }

  return (
    <Connected
      userEmail={userEmail}
      onUserEmailChange={onUserEmailChange}
      notifyEnabled={notifyEnabled}
      onNotifyChange={onNotifyChange}
      compact={compact}
    />
  );
}

// ============================================================================
// Connected sub-component (handles statuses 2-4)
// ============================================================================

function Connected({
  userEmail,
  onUserEmailChange,
  notifyEnabled,
  onNotifyChange,
  compact
}: Omit<Props, "unlocked">) {
  const [emailInput, setEmailInput] = useState(userEmail);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [code, setCode] = useState<CodeResponse | null>(null);
  const [loading, setLoading] = useState<"" | "connect" | "check" | "unlink" | "status">("");
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const tickRef = useRef<number | null>(null);

  // Keep the parent's persisted userEmail in sync with our input.
  useEffect(() => {
    setEmailInput(userEmail);
  }, [userEmail]);

  // ----- status fetch (initial + on demand) ------------------------------
  const refreshStatus = useCallback(
    async (id: string) => {
      const trimmed = id.trim();
      if (!trimmed) {
        setStatus(null);
        return;
      }
      setLoading("status");
      try {
        const res = await fetch(
          `/api/alerts/telegram/status?userEmail=${encodeURIComponent(trimmed)}`,
          { cache: "no-store" }
        );
        const data = (await res.json()) as StatusResponse;
        setStatus(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading("");
      }
    },
    []
  );

  useEffect(() => {
    if (userEmail) void refreshStatus(userEmail);
  }, [userEmail, refreshStatus]);

  // ----- live countdown for the active code ------------------------------
  useEffect(() => {
    if (!code?.expiresAt) return;
    setNow(Date.now());
    tickRef.current = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [code?.expiresAt]);

  // ----- actions ---------------------------------------------------------
  const onConnect = async () => {
    const trimmed = emailInput.trim();
    if (!trimmed) {
      setError("Enter a user identifier first.");
      return;
    }
    onUserEmailChange(trimmed);
    setLoading("connect");
    setError(null);
    setCode(null);
    try {
      const res = await fetch("/api/alerts/telegram/link-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: trimmed })
      });
      const data = (await res.json()) as CodeResponse & { error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || data.reason || "Could not generate code");
        return;
      }
      if (!data.ready) {
        setError(humanReason(data.reason));
        return;
      }
      setCode(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading("");
    }
  };

  const onCheck = async () => {
    setLoading("check");
    setError(null);
    try {
      await refreshStatus(emailInput);
    } finally {
      setLoading("");
    }
  };

  const onUnlink = async () => {
    if (!userEmail) return;
    setLoading("unlink");
    setError(null);
    try {
      await fetch("/api/alerts/telegram/unlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail })
      });
      setStatus({ ok: true, linked: false });
      setCode(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading("");
    }
  };

  // ----- derived ---------------------------------------------------------
  const linked = Boolean(status?.linked);
  const featureBlocked =
    status && (status.featureEnabled === false || status.hasToken === false);
  const tgDeepLink =
    code?.botUsername && code.code
      ? `https://t.me/${encodeURIComponent(code.botUsername)}?start=${encodeURIComponent(code.code)}`
      : null;

  return (
    <div
      className={clsx(
        "flex flex-col gap-2 rounded-xl border border-white/8 bg-white/[0.025] p-2.5",
        compact && "p-2"
      )}
    >
      {/* ---- header row: bell + label + soft-alert toggle ---- */}
      <div className="flex items-start justify-between gap-3">
        <span className="flex items-start gap-2">
          <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent/85" />
          <span className="flex flex-col leading-tight">
            <span className="text-[12px] font-medium text-white/85">
              Telegram Mission Alerts
            </span>
            <span className="text-[10px] text-white/45">
              Notify me when a mission needs human action.
            </span>
          </span>
        </span>
        <ToggleSwitch
          checked={notifyEnabled}
          disabled={!linked}
          onChange={onNotifyChange}
          ariaLabel="Notify me on human-action cases"
        />
      </div>

      {/* ---- body: connection state ---- */}
      <div className="border-t border-white/5 pt-2">
        {featureBlocked ? (
          <Notice tone="warn">
            {status?.featureEnabled === false
              ? "Mission Alerts are disabled on the server."
              : "Telegram bot token is not configured on the server."}
          </Notice>
        ) : linked ? (
          <LinkedState
            userEmail={userEmail}
            chatHint={status?.chatHint}
            linkedAt={status?.linkedAt}
            onUnlink={onUnlink}
            unlinking={loading === "unlink"}
          />
        ) : code ? (
          <CodeState
            code={code}
            now={now}
            checking={loading === "check"}
            tgDeepLink={tgDeepLink}
            onCheck={onCheck}
            onCancel={() => setCode(null)}
          />
        ) : (
          <DisconnectedState
            value={emailInput}
            onChange={setEmailInput}
            onConnect={onConnect}
            connecting={loading === "connect"}
          />
        )}

        {error && <Notice tone="err">{error}</Notice>}
        {!linked && status?.hasAdminFallback && !error && (
          <p className="mt-1.5 text-[10px] text-white/40">
            Hard failures (e.g. blocked safety screen) still alert the admin chat.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Sub-states
// ============================================================================

function LinkedState({
  userEmail,
  chatHint,
  linkedAt,
  onUnlink,
  unlinking
}: {
  userEmail: string;
  chatHint?: string;
  linkedAt?: number;
  onUnlink: () => void;
  unlinking?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-start gap-2">
        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
        <div className="flex flex-col leading-tight">
          <span className="text-[12px] text-white/85">
            Connected as <span className="font-mono text-white/70">{userEmail}</span>
          </span>
          <span className="text-[10px] text-white/45">
            chat {chatHint ?? "—"} · {linkedAt ? formatDate(linkedAt) : "linked"}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onUnlink}
        disabled={unlinking}
        className="no-drag inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-white/65 transition hover:bg-white/[0.06] hover:text-white/85 disabled:opacity-40"
        title="Disconnect this Telegram chat"
      >
        {unlinking ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <UnlinkIcon className="h-3 w-3" />
        )}
        Disconnect
      </button>
    </div>
  );
}

function DisconnectedState({
  value,
  onChange,
  onConnect,
  connecting
}: {
  value: string;
  onChange: (v: string) => void;
  onConnect: () => void;
  connecting?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="you@email.com"
        className="no-drag w-full rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[11px] text-white/85 placeholder:text-white/30 focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/30"
        spellCheck={false}
        autoComplete="off"
      />
      <button
        type="button"
        onClick={onConnect}
        disabled={connecting || !value.trim()}
        className="no-drag inline-flex items-center justify-center gap-1.5 rounded-md border border-accent/30 bg-accent/[0.1] px-2 py-1 text-[11px] font-medium text-accent transition hover:bg-accent/[0.16] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {connecting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ExternalLink className="h-3.5 w-3.5" />
        )}
        Connect Telegram
      </button>
    </div>
  );
}

function CodeState({
  code,
  now,
  checking,
  tgDeepLink,
  onCheck,
  onCancel
}: {
  code: CodeResponse;
  now: number;
  checking?: boolean;
  tgDeepLink: string | null;
  onCheck: () => void;
  onCancel: () => void;
}) {
  const remainingMs = (code.expiresAt ?? 0) - now;
  const expired = remainingMs <= 0;
  const message = code.code ? `/start ${code.code}` : "";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-white/45">
        <span>Send to @{code.botUsername}</span>
        <span className="font-mono text-white/55">
          {expired ? "expired" : `expires in ${formatRemaining(remainingMs)}`}
        </span>
      </div>

      <button
        type="button"
        onClick={() => navigator.clipboard?.writeText(message)}
        className="no-drag flex items-center justify-between rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-left transition hover:bg-black/40"
        title="Click to copy"
      >
        <span className="truncate font-mono text-[12px] text-white/85">{message}</span>
        <span className="ml-2 text-[9px] uppercase tracking-wider text-white/35">
          copy
        </span>
      </button>

      <div className="flex items-center gap-1.5">
        {tgDeepLink && (
          <a
            href={tgDeepLink}
            target="_blank"
            rel="noreferrer"
            className="no-drag inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-accent/30 bg-accent/[0.08] px-2 py-1 text-[11px] font-medium text-accent transition hover:bg-accent/[0.14]"
          >
            <ExternalLink className="h-3 w-3" />
            Open Telegram
          </a>
        )}
        <button
          type="button"
          onClick={onCheck}
          disabled={checking || expired}
          className="no-drag inline-flex items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] font-medium text-white/85 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {checking ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Check
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="no-drag inline-flex items-center justify-center rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] font-medium text-white/65 transition hover:bg-white/[0.06] hover:text-white/85"
        >
          Cancel
        </button>
      </div>

      <p className="text-[10px] text-white/40">
        After sending, click <span className="text-white/65">Check</span> to confirm
        the connection.
      </p>
    </div>
  );
}

function ToggleSwitch({
  checked,
  disabled,
  onChange,
  ariaLabel
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <span
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      title={disabled ? "Connect Telegram to enable" : ariaLabel}
      onClick={() => !disabled && onChange(!checked)}
      className={clsx(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition",
        disabled && "cursor-not-allowed opacity-40",
        checked ? "bg-accent shadow-glow" : "bg-white/10"
      )}
    >
      <span
        className={clsx(
          "inline-block h-4 w-4 transform rounded-full bg-white transition",
          checked ? "translate-x-[18px]" : "translate-x-[2px]"
        )}
      />
    </span>
  );
}

function Notice({ tone, children }: { tone: "warn" | "err"; children: React.ReactNode }) {
  const cls = {
    warn: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    err: "border-red-500/30 bg-red-500/10 text-red-200"
  }[tone];
  return (
    <div className={clsx("mt-1.5 rounded-md border px-2 py-1 text-[10px]", cls)}>
      {children}
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatRemaining(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function formatDate(ts: number): string {
  try {
    return new Date(ts).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "linked";
  }
}

function humanReason(reason?: string): string {
  switch (reason) {
    case "feature_disabled":
      return "Mission Alerts are disabled on this server.";
    case "no_token":
      return "Server has no Telegram bot token configured.";
    case "no_bot_username":
      return "Server hasn't configured TELEGRAM_BOT_USERNAME.";
    case "rate_limited":
      return "Too many requests — try again in a minute.";
    default:
      return reason || "Could not connect.";
  }
}

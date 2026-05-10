"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  AlertTriangle,
  Bell,
  ChevronDown,
  ChevronRight,
  Inbox,
  RefreshCw,
  Trash2
} from "lucide-react";
import type { AlertRecord, AlertSentTo } from "@/lib/alert-inbox";
import type { AlertSeverity, AlertType } from "@/lib/mission-alerts";

/**
 * Compact Mission Alert inbox. Lives in the Telemetry column.
 *
 * Behaviour:
 *   - polls /api/alerts/inbox every POLL_MS while mounted, when both
 *     `unlocked` and `userEmail` are set
 *   - re-fetches on `reloadKey` change (caller bumps after each fix /
 *     architect run)
 *   - rows expand inline to show mission + reason
 *   - mark-read is optimistic; delete is confirmed-on-second-click
 *
 * Never receives secrets — only the public AlertRecord shape.
 */

interface Props {
  unlocked: boolean;
  userEmail: string;
  /** Bumped by the parent after each successful mission run. */
  reloadKey?: number;
  compact?: boolean;
}

interface InboxResponse {
  ok: boolean;
  records: AlertRecord[];
  unread: number;
  limit: number;
}

const POLL_MS = 30_000;
const VISIBLE_LIMIT = 6;

export function MissionAlertInbox({
  unlocked,
  userEmail,
  reloadKey,
  compact
}: Props) {
  const [records, setRecords] = useState<AlertRecord[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const trimmedEmail = userEmail.trim();
  const ready = unlocked && trimmedEmail.length > 0;

  const intervalRef = useRef<number | null>(null);
  const pollTokenRef = useRef(0);

  const fetchInbox = useCallback(
    async (silent = false) => {
      if (!ready) return;
      const myToken = ++pollTokenRef.current;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/alerts/inbox?userEmail=${encodeURIComponent(trimmedEmail)}&limit=50`,
          { cache: "no-store" }
        );
        // If a newer fetch started while this one was in flight, drop.
        if (myToken !== pollTokenRef.current) return;
        const data = (await res.json()) as InboxResponse;
        if (!res.ok || !data.ok) {
          if (!silent) setError("inbox unavailable");
          return;
        }
        setRecords(data.records || []);
        setUnread(data.unread || 0);
      } catch (err) {
        if (!silent) setError((err as Error).message);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [ready, trimmedEmail]
  );

  // Polling lifecycle.
  useEffect(() => {
    if (!ready) return;
    void fetchInbox();
    intervalRef.current = window.setInterval(() => {
      void fetchInbox(true);
    }, POLL_MS);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [ready, fetchInbox]);

  // External reload trigger.
  useEffect(() => {
    if (!ready) return;
    void fetchInbox(true);
  }, [reloadKey, ready, fetchInbox]);

  const onMarkRead = useCallback(
    async (alertId: string, read: boolean) => {
      // Optimistic.
      setRecords((prev) =>
        prev.map((r) => (r.id === alertId ? { ...r, read } : r))
      );
      setUnread((u) => Math.max(0, u + (read ? -1 : 1)));
      try {
        await fetch("/api/alerts/inbox/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userEmail: trimmedEmail, alertId, read })
        });
      } catch {
        // re-sync on failure
        void fetchInbox(true);
      }
    },
    [trimmedEmail, fetchInbox]
  );

  const onDelete = useCallback(
    async (alertId: string) => {
      // Two-click confirmation: first click sets confirmingDelete; second
      // click within ~3s actually deletes.
      if (confirmingDelete !== alertId) {
        setConfirmingDelete(alertId);
        window.setTimeout(() => {
          setConfirmingDelete((c) => (c === alertId ? null : c));
        }, 3000);
        return;
      }
      setConfirmingDelete(null);
      const removed = records.find((r) => r.id === alertId);
      // Optimistic.
      setRecords((prev) => prev.filter((r) => r.id !== alertId));
      if (removed && !removed.read) setUnread((u) => Math.max(0, u - 1));
      try {
        await fetch("/api/alerts/inbox/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userEmail: trimmedEmail, alertId })
        });
      } catch {
        void fetchInbox(true);
      }
    },
    [confirmingDelete, records, trimmedEmail, fetchInbox]
  );

  const visible = useMemo(
    () => (showAll ? records : records.slice(0, VISIBLE_LIMIT)),
    [records, showAll]
  );

  // ---------- empty / unset states ---------------------------------------

  if (!unlocked) return null;

  if (!trimmedEmail) {
    return (
      <Card compact={compact} unread={0}>
        <p className="text-[10px] text-white/45">
          Set an alert identity to view your Mission Alert inbox.
        </p>
      </Card>
    );
  }

  // ---------- main ------------------------------------------------------

  return (
    <Card
      compact={compact}
      unread={unread}
      busy={loading}
      onRefresh={() => void fetchInbox()}
    >
      {error && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-200">
          {error}
        </div>
      )}

      {records.length === 0 ? (
        <p className="text-[10px] text-white/40">
          No alerts yet. Mission failures + low-confidence runs land here.
        </p>
      ) : (
        <>
          <ul className="flex flex-col">
            {visible.map((r) => {
              const isOpen = expanded === r.id;
              return (
                <li
                  key={r.id}
                  className={clsx(
                    "border-b border-white/5 last:border-b-0",
                    !r.read && "bg-accent/[0.04]"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : r.id)}
                    className="no-drag flex w-full items-start gap-2 px-2 py-1.5 text-left transition hover:bg-white/[0.03]"
                  >
                    <SeverityDot severity={r.severity} unread={!r.read} />
                    <div className="flex min-w-0 flex-1 flex-col leading-tight">
                      <div className="flex items-center gap-1.5">
                        <TypePill type={r.type} />
                        <SentToPill sentTo={r.sentTo} telegramSent={r.telegramSent} />
                      </div>
                      <div
                        className={clsx(
                          "mt-0.5 truncate text-[11px]",
                          r.read ? "text-white/55" : "text-white/85"
                        )}
                      >
                        {r.summary}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="font-mono text-[9px] text-white/35">
                        {timeAgo(r.createdAt)}
                      </span>
                      {isOpen ? (
                        <ChevronDown className="h-3 w-3 text-white/35" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-white/35" />
                      )}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="space-y-2 border-t border-white/5 bg-black/20 px-2.5 py-2">
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-white/35">
                          Mission
                        </div>
                        <div className="mt-0.5 max-h-[120px] overflow-auto whitespace-pre-wrap font-mono text-[10.5px] text-white/75 scrollbar-thin">
                          {r.mission || "(empty)"}
                        </div>
                      </div>
                      {r.reason && (
                        <div>
                          <div className="text-[9px] uppercase tracking-wider text-white/35">
                            Reason
                          </div>
                          <div className="mt-0.5 text-[10.5px] text-white/65">
                            {r.reason}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => void onMarkRead(r.id, !r.read)}
                          className="no-drag rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-white/65 transition hover:bg-white/[0.08] hover:text-white/85"
                        >
                          {r.read ? "Mark unread" : "Mark read"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDelete(r.id)}
                          className={clsx(
                            "no-drag inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] transition",
                            confirmingDelete === r.id
                              ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                              : "border-white/10 bg-white/[0.04] text-white/55 hover:bg-rose-500/[0.08] hover:text-rose-200"
                          )}
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                          {confirmingDelete === r.id ? "Confirm?" : "Delete"}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {records.length > VISIBLE_LIMIT && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="no-drag mt-1.5 w-full rounded border border-white/8 bg-white/[0.02] py-1 text-[10px] uppercase tracking-wider text-white/55 transition hover:bg-white/[0.05] hover:text-white/75"
            >
              {showAll ? "Show recent" : `Show all (${records.length})`}
            </button>
          )}
        </>
      )}
    </Card>
  );
}

// ============================================================================
// Bits
// ============================================================================

function Card({
  compact,
  unread,
  busy,
  onRefresh,
  children
}: {
  compact?: boolean;
  unread: number;
  busy?: boolean;
  onRefresh?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section
      className={clsx(
        "flex flex-col gap-1.5 rounded-2xl border border-white/6 bg-white/[0.015] p-2.5",
        compact && "p-2"
      )}
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Inbox className="h-3 w-3 text-accent/80" />
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/55">
            Mission Alerts
          </span>
          {unread > 0 && (
            <span className="rounded-full bg-accent/15 px-1.5 py-0 font-mono text-[9px] text-accent">
              {unread}
            </span>
          )}
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={busy}
            title="Refresh"
            className="no-drag rounded p-0.5 text-white/40 transition hover:bg-white/5 hover:text-white/70 disabled:opacity-40"
          >
            <RefreshCw className={clsx("h-3 w-3", busy && "animate-spin")} />
          </button>
        )}
      </header>
      {children}
    </section>
  );
}

function SeverityDot({
  severity,
  unread
}: {
  severity: AlertSeverity;
  unread?: boolean;
}) {
  const cls = {
    high: "bg-rose-400 shadow-[0_0_4px_1px_rgba(248,113,113,0.5)]",
    medium: "bg-amber-400 shadow-[0_0_4px_1px_rgba(251,191,36,0.45)]",
    low: "bg-emerald-400 shadow-[0_0_4px_1px_rgba(52,211,153,0.45)]"
  }[severity];
  return (
    <span
      className={clsx(
        "relative mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full",
        cls,
        unread &&
          (severity === "high"
            ? "after:absolute after:inset-0 after:animate-ping after:rounded-full after:bg-rose-400/40"
            : "")
      )}
    />
  );
}

function TypePill({ type }: { type: AlertType }) {
  const label = TYPE_LABEL[type];
  const cls = {
    mission_failed: "border-rose-500/30 bg-rose-500/10 text-rose-200",
    needs_human: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    low_confidence: "border-white/15 bg-white/[0.05] text-white/65",
    system_error: "border-rose-500/40 bg-rose-500/15 text-rose-100"
  }[type];
  return (
    <span
      className={clsx(
        "rounded border px-1 py-px font-mono text-[8.5px] uppercase tracking-wider",
        cls
      )}
    >
      {label}
    </span>
  );
}

function SentToPill({
  sentTo,
  telegramSent
}: {
  sentTo: AlertSentTo;
  telegramSent: boolean;
}) {
  const text = sentTo === "user" ? "you" : sentTo === "admin" ? "admin" : "none";
  const cls = telegramSent
    ? "border-emerald-500/25 bg-emerald-500/8 text-emerald-200/80"
    : "border-white/10 bg-white/[0.03] text-white/45";
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-0.5 rounded border px-1 py-px font-mono text-[8.5px] uppercase tracking-wider",
        cls
      )}
      title={
        telegramSent
          ? `Sent via Telegram → ${text}`
          : "Telegram skipped — recorded only in this inbox"
      }
    >
      {telegramSent ? <Bell className="h-2 w-2" /> : <AlertTriangle className="h-2 w-2" />}
      {text}
    </span>
  );
}

const TYPE_LABEL: Record<AlertType, string> = {
  mission_failed: "FAILED",
  needs_human: "HUMAN",
  low_confidence: "LOW CONF",
  system_error: "SYSTEM"
};

function timeAgo(iso: string): string {
  const now = Date.now();
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const diff = Math.max(0, now - t);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return new Date(t).toLocaleDateString([], { month: "short", day: "numeric" });
}

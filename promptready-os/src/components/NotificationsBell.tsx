"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Cpu,
  FileText,
  Inbox as InboxIcon,
  Play,
  Rocket,
  X
} from "lucide-react";
import { useAtlasStore } from "@/store/atlas";
import { useMissionStore } from "@/store/mission";
import { probeOllama } from "@/services/missionRunner";

/**
 * Operator notifications · Phase 18.
 *
 * Lightweight bell + dropdown summarising real local signals:
 *
 *   · workflows awaiting approval
 *   · receipts ready since last view
 *   · approval pending (same as workflows above, surfaced separately)
 *   · Ollama offline / reachable
 *   · repo / memory imports since last view
 *   · inbox items since last view
 *
 * Counts always reflect real state. The "viewed" timestamp resets when
 * the user opens the dropdown.
 */

type OllamaState = "unknown" | "ok" | "off";

interface Item {
  id: string;
  Icon: typeof Bell;
  tone: "ok" | "warn" | "muted";
  label: string;
  hint?: string;
}

export function NotificationsBell() {
  const runs = useAtlasStore((s) => s.workflowRuns);
  const inbox = useAtlasStore((s) => s.inbox);
  const memoryDocs = useAtlasStore((s) => s.memoryDocs);
  const viewedAt = useAtlasStore((s) => s.notificationsViewedAt);
  const markViewed = useAtlasStore((s) => s.markNotificationsViewed);
  const history = useMissionStore((s) => s.history);

  const [open, setOpen] = useState(false);
  const [ollama, setOllama] = useState<OllamaState>("unknown");
  const ref = useRef<HTMLDivElement>(null);

  // Probe Ollama on open and every 60s while open.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const tick = async () => {
      const p = await probeOllama();
      if (cancelled) return;
      setOllama(p.reachable ? "ok" : "off");
    };
    void tick();
    const id = window.setInterval(tick, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [open]);

  // Click-outside to close.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const awaitingApproval = runs.filter((r) => r.status === "awaiting-approval");
  const recentReceipts = history.filter(
    (h) => (h.endedAt ?? h.startedAt) > viewedAt
  );
  const recentImports = memoryDocs.filter((d) => d.addedAt > viewedAt);
  const recentInbox = inbox.filter((i) => i.addedAt > viewedAt && i.state === "new");

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    if (awaitingApproval.length > 0) {
      out.push({
        id: "approval",
        Icon: AlertTriangle,
        tone: "warn",
        label: `${awaitingApproval.length} workflow${awaitingApproval.length === 1 ? "" : "s"} waiting for approval`,
        hint: awaitingApproval[0].id
      });
    }
    if (recentReceipts.length > 0) {
      out.push({
        id: "receipts",
        Icon: CheckCircle2,
        tone: "ok",
        label: `${recentReceipts.length} receipt${recentReceipts.length === 1 ? "" : "s"} ready`
      });
    }
    if (recentImports.length > 0) {
      out.push({
        id: "imports",
        Icon: FileText,
        tone: "ok",
        label: `${recentImports.length} memory doc${recentImports.length === 1 ? "" : "s"} imported`
      });
    }
    if (recentInbox.length > 0) {
      out.push({
        id: "inbox",
        Icon: InboxIcon,
        tone: "ok",
        label: `${recentInbox.length} new inbox item${recentInbox.length === 1 ? "" : "s"}`
      });
    }
    if (ollama === "off") {
      out.push({
        id: "ollama",
        Icon: Cpu,
        tone: "muted",
        label: "Ollama offline",
        hint: "localhost:11434 unreachable"
      });
    } else if (ollama === "ok") {
      out.push({
        id: "ollama-ok",
        Icon: Cpu,
        tone: "ok",
        label: "Ollama reachable",
        hint: "models ready · /api/generate"
      });
    }
    return out;
  }, [awaitingApproval, recentReceipts, recentImports, recentInbox, ollama]);

  const unread = awaitingApproval.length + recentReceipts.length + recentImports.length + recentInbox.length;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) markViewed();
        }}
        title="Operator notifications"
        className={clsx(
          "no-drag relative inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition",
          unread > 0
            ? "border-accent/40 bg-accent/[0.08] text-accent shadow-glow"
            : "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.06]"
        )}
      >
        <Bell className="h-3 w-3" />
        {unread > 0 ? unread : "ok"}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-1.5 w-[320px] overflow-hidden rounded-2xl border border-white/10 bg-graphite-900/95 shadow-glass backdrop-blur">
          <header className="flex items-center justify-between border-b border-white/8 px-3 py-1.5">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
              operator notifications
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-0.5 text-white/55 hover:bg-white/[0.06] hover:text-white"
              aria-label="Close"
            >
              <X className="h-3 w-3" />
            </button>
          </header>

          {items.length === 0 ? (
            <p className="px-3 py-4 text-center text-[11.5px] text-white/55">
              All clear · no signals to surface.
            </p>
          ) : (
            <ul className="flex max-h-[300px] flex-col divide-y divide-white/6 overflow-auto">
              {items.map((it) => (
                <li key={it.id} className="flex items-start gap-2 px-3 py-2">
                  <it.Icon
                    className={clsx(
                      "mt-0.5 h-3.5 w-3.5 shrink-0",
                      it.tone === "ok"
                        ? "text-emerald-300/85"
                        : it.tone === "warn"
                          ? "text-amber-300/85"
                          : "text-white/55"
                    )}
                  />
                  <div className="flex min-w-0 flex-col">
                    <span className="text-[12px] text-white/85">{it.label}</span>
                    {it.hint && (
                      <span className="font-mono text-[10px] text-white/45">
                        {it.hint}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {awaitingApproval.length > 0 && (
            <footer className="border-t border-white/8 bg-amber-500/[0.05] px-3 py-1.5">
              <a
                href="/"
                className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-amber-200/85 hover:text-amber-100"
              >
                <Play className="h-2.5 w-2.5" /> open workflow canvas
              </a>
            </footer>
          )}
          {recentReceipts.length > 0 && (
            <footer className="border-t border-white/8 px-3 py-1.5">
              <a
                href="/library"
                className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-white/65 hover:text-white"
              >
                <Rocket className="h-2.5 w-2.5" /> view receipts
              </a>
            </footer>
          )}
        </div>
      )}
    </div>
  );
}

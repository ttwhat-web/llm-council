"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Loader2,
  RefreshCw,
  Send
} from "lucide-react";
import {
  getTelegramBridgeStatus,
  sendTelegramMessage,
  pollTelegramUpdates,
  resetTelegramLiveState,
  readTelegramConfig,
  TELEGRAM_SETUP_NOTES,
  type TelegramBridgeStatusLive
} from "@/services/telegramLive";

/**
 * Telegram Live · Settings card.
 *
 * Shows the live bridge status next to the existing simulator. Buttons:
 *   · Send test message · POST one round-trip to api.telegram.org
 *   · Poll once         · GET /getUpdates with offset cursor
 *   · Copy setup notes  · clipboard
 *   · Reset live state  · clears cursor + last error
 *
 * The token never lands in localStorage. The button shows the source
 * (runtime / env / none) so the operator knows where it came from.
 */

export function TelegramLiveCard() {
  const [status, setStatus] = useState<TelegramBridgeStatusLive>(() => getTelegramBridgeStatus());
  const [busy, setBusy] = useState<"send" | "poll" | null>(null);
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const refresh = () => setStatus(getTelegramBridgeStatus());
    const t = window.setInterval(refresh, 5000);
    return () => window.clearInterval(t);
  }, []);

  const cfg = readTelegramConfig();

  const onSend = async () => {
    setBusy("send");
    const r = await sendTelegramMessage(
      "✅ PromptReady OS test message · from Settings → Telegram Live"
    );
    setStatus(getTelegramBridgeStatus());
    setFlash({ ok: r.ok, text: r.ok ? "round-trip ok" : r.error ?? "send failed" });
    setBusy(null);
    window.setTimeout(() => setFlash(null), 5000);
  };

  const onPoll = async () => {
    setBusy("poll");
    const r = await pollTelegramUpdates();
    setStatus(getTelegramBridgeStatus());
    setFlash({
      ok: !r.error,
      text: r.error ?? `poll ok · processed ${r.count} update${r.count === 1 ? "" : "s"}`
    });
    setBusy(null);
    window.setTimeout(() => setFlash(null), 5000);
  };

  const onCopy = () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    void navigator.clipboard.writeText(TELEGRAM_SETUP_NOTES.join("\n"));
    setFlash({ ok: true, text: "setup notes copied" });
    window.setTimeout(() => setFlash(null), 3000);
  };

  const onReset = () => {
    resetTelegramLiveState();
    setStatus(getTelegramBridgeStatus());
    setFlash({ ok: true, text: "live state reset · token untouched" });
    window.setTimeout(() => setFlash(null), 3000);
  };

  return (
    <section
      className={
        status.live === "live-connected"
          ? "rounded-2xl border border-emerald-400/30 bg-emerald-500/[0.04] p-4 shadow-glow"
          : status.live === "error"
            ? "rounded-2xl border border-rose-400/30 bg-rose-500/[0.04] p-4"
            : status.live === "live-ready"
              ? "rounded-2xl border border-accent/25 bg-accent/[0.04] p-4"
              : "rounded-2xl border border-white/10 bg-white/[0.02] p-4"
      }
    >
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Telegram Live Bridge</span>
        </div>
        <span
          className={
            status.live === "live-connected"
              ? "rounded border border-emerald-400/30 bg-emerald-500/[0.08] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-emerald-200"
              : status.live === "live-ready"
                ? "rounded border border-accent/30 bg-accent/[0.08] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-accent"
                : status.live === "error"
                  ? "rounded border border-rose-400/30 bg-rose-500/[0.08] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-rose-200"
                  : "rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/55"
          }
        >
          {status.live}
        </span>
      </header>

      <p className="text-[11.5px] text-white/65">
        Real adapter on top of the bridge simulator. Token + chat id read
        from runtime config or build-time env · never from localStorage.
        Without them, simulator stays available.
      </p>

      <ul className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
        <Stat label="bot token" value={status.hasToken ? "configured" : "missing"} ok={status.hasToken} />
        <Stat label="allowed chat" value={status.hasChatId ? "configured" : "missing"} ok={status.hasChatId} />
        <Stat label="source" value={status.source} ok={status.source !== "none"} />
        <Stat
          label="last send"
          value={status.lastSendAt ? new Date(status.lastSendAt).toLocaleTimeString() : "never"}
          ok={!!status.lastSendAt}
        />
        <Stat
          label="last poll"
          value={status.lastPollAt ? new Date(status.lastPollAt).toLocaleTimeString() : "never"}
          ok={!!status.lastPollAt}
        />
        <Stat
          label="last error"
          value={status.lastError ?? "—"}
          ok={!status.lastError}
        />
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onSend}
          disabled={busy === "send" || !cfg.token}
          title={!cfg.token ? "no token configured" : "POST one /sendMessage"}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent/90 px-2.5 py-1.5 text-[12px] font-semibold text-white shadow-glow transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy === "send" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Send test message
        </button>
        <button
          type="button"
          onClick={onPoll}
          disabled={busy === "poll" || !cfg.token}
          title={!cfg.token ? "no token configured" : "GET /getUpdates once"}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[12px] font-medium text-white/85 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy === "poll" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Poll once
        </button>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[12px] font-medium text-white/85 hover:bg-white/[0.06]"
        >
          <Copy className="h-3.5 w-3.5" /> Copy setup notes
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 rounded-md border border-rose-400/25 bg-rose-500/[0.06] px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-rose-200 hover:bg-rose-500/[0.12]"
        >
          reset live state
        </button>
      </div>

      {flash && (
        <p
          className={
            flash.ok
              ? "mt-2 inline-flex items-center gap-1.5 rounded-md border border-emerald-400/30 bg-emerald-500/[0.08] px-2 py-1 font-mono text-[10.5px] uppercase tracking-wider text-emerald-200"
              : "mt-2 inline-flex items-center gap-1.5 rounded-md border border-rose-400/30 bg-rose-500/[0.08] px-2 py-1 font-mono text-[10.5px] uppercase tracking-wider text-rose-200"
          }
        >
          {flash.ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
          {flash.text}
        </p>
      )}

      <details className="mt-3 text-[11px] text-white/55">
        <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-white/65">
          setup notes
        </summary>
        <ol className="mt-2 list-decimal pl-5 text-[11px]">
          {TELEGRAM_SETUP_NOTES.map((n, i) => (
            <li key={i} className="my-0.5">
              {n.replace(/^\d+\.\s*/, "")}
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}

function Stat({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <li className="flex items-center justify-between rounded-md border border-white/8 bg-white/[0.012] px-2 py-1 text-[11px]">
      <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/40">{label}</span>
      <span className={ok ? "font-mono text-white/85" : "font-mono text-white/55"}>{value}</span>
    </li>
  );
}

"use client";

import clsx from "clsx";
import { ExternalLink, MessageCircle, MessagesSquare, Radio, Send } from "lucide-react";
import { statusForModule, statusMeta } from "@/services/adapters";
import { getTelegramBridgeStatus, type TelegramLiveStatus } from "@/services/telegramLive";

/**
 * Communications Runtime · adapter only.
 *
 * Surfaces five communication sources (Gmail, IMAP, Outlook, WhatsApp,
 * Telegram) as an honest seam — NOT a live inbox or chat client. Only
 * the existing local Telegram bridge can be non-offline today. Mail
 * providers resolve through the shared adapter registry (offline until
 * the desktop runtime wires OAuth/IMAP). WhatsApp is design-only.
 *
 * Capabilities are honest defaults: nothing reads, classifies, drafts,
 * or sends today. Send is disabled until explicit approval; approval is
 * always required. No fake connected, no fake send, no fake inbox.
 */

type Tone = "ok" | "accent" | "muted" | "bad";

const TONE_PILL: Record<Tone, string> = {
  ok: "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200",
  accent: "border-accent/30 bg-accent/[0.08] text-accent",
  muted: "border-white/10 bg-white/[0.03] text-white/55",
  bad: "border-rose-400/30 bg-rose-500/[0.08] text-rose-200"
};

interface SourceState {
  label: string;
  tone: Tone;
  connected: boolean;
}

/** Telegram live status → honest pill. simulator renders as adapter-ready. */
const TELEGRAM_STATE: Record<TelegramLiveStatus, SourceState> = {
  "live-connected": { label: "connected", tone: "ok", connected: true },
  "live-ready": { label: "needs setup", tone: "accent", connected: false },
  error: { label: "error", tone: "bad", connected: false },
  simulator: { label: "needs setup", tone: "accent", connected: false }
};

function emailSourceState(): SourceState {
  const status = statusForModule("email").status;
  const meta = statusMeta(status);
  return { label: meta.label, tone: meta.tone, connected: status === "connected" };
}

interface SourceRow {
  name: string;
  state: SourceState;
}

type Capability = "planned" | "disabled" | "required";

interface CapabilityRow {
  source: string;
  read: Capability;
  classify: Capability;
  mission: Capability;
  draft: Capability;
  send: Capability;
  approval: Capability;
}

const CAPABILITY_COLUMNS: { key: keyof Omit<CapabilityRow, "source">; label: string }[] = [
  { key: "read", label: "read" },
  { key: "classify", label: "classify" },
  { key: "mission", label: "create mission" },
  { key: "draft", label: "draft reply" },
  { key: "send", label: "send reply" },
  { key: "approval", label: "approval" }
];

/** Honest defaults — none of this is live. */
function defaultCapabilities(source: string): CapabilityRow {
  return {
    source,
    read: "planned",
    classify: "planned",
    mission: "planned",
    draft: "planned",
    send: "disabled",
    approval: "required"
  };
}

const CAPABILITY_META: Record<Capability, { text: string; cls: string }> = {
  planned: { text: "planned", cls: "text-white/45" },
  disabled: { text: "disabled", cls: "text-rose-300/80" },
  required: { text: "required", cls: "text-amber-300/90" }
};

const TELEGRAM_COMMANDS = ["/status", "/run", "/approve", "/receipt"];

const WHATSAPP_OPTIONS = [
  "Twilio WhatsApp API",
  "Meta WhatsApp Cloud API",
  "local notification bridge (later)"
];

export function CommunicationsRuntimeCard() {
  const email = emailSourceState();
  const tg = getTelegramBridgeStatus();
  const telegram = TELEGRAM_STATE[tg.live];
  const whatsapp: SourceState = { label: "planned", tone: "muted", connected: false };

  const sources: SourceRow[] = [
    { name: "Gmail", state: email },
    { name: "IMAP", state: email },
    { name: "Outlook", state: email },
    { name: "WhatsApp", state: whatsapp },
    { name: "Telegram", state: telegram }
  ];

  const liveCount = sources.filter((s) => s.state.connected).length;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessagesSquare className="h-4 w-4 text-accent" />
          <Radio className="h-3.5 w-3.5 text-accent/70" />
          <span className="text-[13px] font-semibold text-white">Communications Runtime</span>
        </div>
        <span
          className={clsx(
            "rounded border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider",
            liveCount > 0 ? TONE_PILL.ok : TONE_PILL.muted
          )}
        >
          {liveCount}/{sources.length} live
        </span>
      </header>

      <p className="text-[11px] text-white/55">
        Five communication sources as an honest seam — not an inbox clone or chat
        client. Only the existing local Telegram bridge can be non-offline today.
        The opener buttons below launch the official web app in your default
        browser — no scraping, no passwords touched here.
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() =>
            typeof window !== "undefined" &&
            window.open(
              "https://web.whatsapp.com",
              "_blank",
              "noopener,noreferrer"
            )
          }
          title="Open WhatsApp Web · OPEN EXTERNAL · Twilio / Meta API planned"
          aria-label="Open WhatsApp Web · OPEN EXTERNAL"
          className="inline-flex items-center gap-1 rounded-md border border-accent/40 bg-accent/[0.1] px-2 py-1 font-mono text-[9.5px] uppercase tracking-wider text-accent transition hover:bg-accent/[0.15]"
        >
          <MessageCircle className="h-3 w-3" /> open whatsapp web
        </button>
        <button
          type="button"
          onClick={() =>
            typeof window !== "undefined" &&
            window.open(
              "https://web.telegram.org",
              "_blank",
              "noopener,noreferrer"
            )
          }
          title="Open Telegram Web · OPEN EXTERNAL · separate from bot bridge"
          aria-label="Open Telegram Web · OPEN EXTERNAL"
          className="inline-flex items-center gap-1 rounded-md border border-accent/40 bg-accent/[0.1] px-2 py-1 font-mono text-[9.5px] uppercase tracking-wider text-accent transition hover:bg-accent/[0.15]"
        >
          <ExternalLink className="h-3 w-3" /> open telegram web
        </button>
        <span
          className="inline-flex items-center gap-1 rounded border border-amber-400/30 bg-amber-500/[0.06] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-200"
          title="WhatsApp Web sessions need a phone scan; web.telegram.org needs SMS / app code"
        >
          provider auth required
        </span>
      </div>

      {/* SOURCES */}
      <ul className="flex flex-col gap-2">
        {sources.map((s) => (
          <li
            key={s.name}
            className="flex items-center justify-between gap-2 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1.5"
          >
            <span className="flex items-center gap-1.5 text-[12px] text-white">
              <MessagesSquare className="h-3.5 w-3.5 text-accent" />
              {s.name}
            </span>
            <span
              className={clsx(
                "rounded border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider",
                TONE_PILL[s.state.tone]
              )}
            >
              {s.state.label}
            </span>
          </li>
        ))}
      </ul>

      {/* CAPABILITIES MATRIX */}
      <div className="flex flex-col gap-2 rounded-xl border border-white/8 bg-white/[0.012] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-[9px] uppercase tracking-wider text-accent">
            capabilities · honest defaults
          </span>
          <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">
            not live
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-mono text-[9.5px]">
            <thead>
              <tr className="text-white/40">
                <th className="px-1.5 py-1 text-left font-normal uppercase tracking-wider">
                  source
                </th>
                {CAPABILITY_COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    className="px-1.5 py-1 text-left font-normal uppercase tracking-wider"
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => {
                const caps = defaultCapabilities(s.name);
                return (
                  <tr key={s.name} className="border-t border-white/6">
                    <td className="px-1.5 py-1 text-white/70">{s.name}</td>
                    {CAPABILITY_COLUMNS.map((c) => {
                      const meta = CAPABILITY_META[caps[c.key]];
                      return (
                        <td key={c.key} className="px-1.5 py-1">
                          <span className={clsx("inline-flex items-center gap-1", meta.cls)}>
                            <span className="h-1 w-1 shrink-0 rounded-full bg-current opacity-70" />
                            {meta.text}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* TELEGRAM COMMANDS */}
      <div className="flex flex-col gap-2 rounded-xl border border-white/8 bg-white/[0.012] p-3">
        <span className="font-mono text-[9px] uppercase tracking-wider text-accent">
          telegram · local command surface
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {TELEGRAM_COMMANDS.map((cmd) => (
            <span
              key={cmd}
              className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] tracking-wider text-white/55"
            >
              {cmd}
            </span>
          ))}
        </div>
      </div>

      {/* WHATSAPP ADAPTER DESIGN */}
      <div className="flex flex-col gap-2 rounded-xl border border-white/8 bg-white/[0.012] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-[9px] uppercase tracking-wider text-accent">
            whatsapp · adapter design only
          </span>
          <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-rose-300/80">
            <Send className="h-3 w-3" />
            no WhatsApp send
          </span>
        </div>
        <ul className="flex flex-col gap-1.5">
          {WHATSAPP_OPTIONS.map((opt) => (
            <li key={opt} className="flex items-center justify-between gap-2">
              <span className="flex items-start gap-1.5 text-[11px] text-white/55">
                <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-accent/50" />
                <span className="font-mono text-[10px] leading-snug text-white/55">{opt}</span>
              </span>
              <span
                className={clsx(
                  "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                  TONE_PILL.muted
                )}
              >
                Coming soon · needs setup
              </span>
            </li>
          ))}
        </ul>
      </div>

      <footer className="border-t border-white/6 pt-2 font-mono text-[9.5px] uppercase tracking-wider text-white/45">
        Phone is remote, not brain. No OAuth, no WhatsApp calls, no mail sync today
        — these are adapter designs + the existing local Telegram bridge.
      </footer>
    </section>
  );
}

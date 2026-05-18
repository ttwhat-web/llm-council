"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Copy,
  Cpu,
  Eye,
  EyeOff,
  Key,
  Palette,
  Phone,
  QrCode,
  RefreshCcw,
  ShieldCheck,
  Terminal as TerminalIcon,
  Trash2
} from "lucide-react";
import { SurfaceHeader } from "@/components/primitives/SurfaceHeader";
import { AutoConfigure } from "@/components/AutoConfigure";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useAtlasStore } from "@/store/atlas";

/**
 * Settings · Phase 13.
 *
 * Sections:
 *   · Auto-configure workspace (one-tap honest setup).
 *   · Appearance (theme palette grid).
 *   · BYOK provider keys (session-only memory today).
 *   · Local engine (Ollama probe label).
 *   · Safety screen toggle.
 *   · Telemetry toggle (off by default).
 *   · Mobile Companion (planned secure pairing — not built yet).
 */

interface ProviderKeyRowProps {
  label: string;
  placeholder: string;
}

function ProviderKeyRow({ label, placeholder }: ProviderKeyRowProps) {
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/40">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="no-drag flex-1 rounded-md border border-white/8 bg-white/[0.025] px-2 py-1.5 text-[12px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5 text-[10.5px] text-white/65 hover:bg-white/[0.06]"
        >
          {show ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [telemetry, setTelemetry] = useState(false);
  const [safetyScreen, setSafetyScreen] = useState(true);

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-5 py-5 md:px-7 md:py-7">
      <SurfaceHeader
        eyebrow="settings · operator preferences"
        title="Settings"
        sub="Auto-setup, appearance, BYOK keys, safety, telemetry, mobile companion. Keys you paste stay in memory for this session only — keychain lands with the desktop runtime."
      />

      <AutoConfigure />

      <section className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
        <header className="flex items-center gap-2">
          <Palette className="h-3.5 w-3.5 text-accent" />
          <span className="text-[13px] font-semibold text-white">Appearance</span>
        </header>
        <p className="text-[11px] text-white/55">
          Five palettes. Choice persists locally and applies to backgrounds,
          accent glows, nav states, buttons, and graph nodes.
        </p>
        <ThemeSwitcher variant="inline" />
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <article className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <header className="flex items-center gap-2">
            <Key className="h-3.5 w-3.5 text-accent" />
            <span className="text-[13px] font-semibold text-white">BYOK · provider keys</span>
          </header>
          <p className="text-[11px] text-white/55">
            Bring your own keys. Routing flips to your account when keys are
            present. Local engines always work without keys.
          </p>
          <ProviderKeyRow label="Anthropic" placeholder="sk-ant-…" />
          <ProviderKeyRow label="OpenAI" placeholder="sk-…" />
          <ProviderKeyRow label="Google" placeholder="AIza…" />
          <p className="flex items-start gap-1.5 rounded-md border border-amber-400/25 bg-amber-500/[0.05] p-2 text-[10.5px] text-amber-200/80">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            Keys stay in this preview's memory only.
          </p>
        </article>

        <article className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <header className="flex items-center gap-2">
            <Cpu className="h-3.5 w-3.5 text-accent" />
            <span className="text-[13px] font-semibold text-white">Local engine</span>
          </header>
          <p className="text-[11px] text-white/55">
            PromptReady OS prefers a local Ollama instance when reachable.
            The probe runs on first mission or from Auto-configure above.
          </p>
          <div className="rounded-md border border-white/8 bg-white/[0.015] p-3 font-mono text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-white/45">ollama host</span>
              <span className="text-white">http://localhost:11434</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-white/45">status</span>
              <span className="text-white/55">probe via Auto-configure</span>
            </div>
          </div>
        </article>

        <article className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <header className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" />
            <span className="text-[13px] font-semibold text-white">Safety screen</span>
          </header>
          <p className="text-[11px] text-white/55">
            Before any terminal command runs, the screen previews + asks for
            confirmation. Recommended on.
          </p>
          <Toggle
            value={safetyScreen}
            onToggle={() => setSafetyScreen((v) => !v)}
            label={safetyScreen ? "Armed" : "Disarmed"}
          />
        </article>

        <article className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <header className="flex items-center gap-2">
            <TerminalIcon className="h-3.5 w-3.5 text-accent" />
            <span className="text-[13px] font-semibold text-white">Telemetry</span>
          </header>
          <p className="text-[11px] text-white/55">
            Off by default. When on, anonymous usage counts are sent —
            never brief content or deliverables.
          </p>
          <Toggle
            value={telemetry}
            onToggle={() => setTelemetry((v) => !v)}
            label={telemetry ? "Sharing anonymous counts" : "Off"}
          />
        </article>
      </section>

      <MobileCompanionCard />
    </div>
  );
}

function Toggle({
  value,
  onToggle,
  label
}: {
  value: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="no-drag inline-flex items-center gap-2 self-start rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11.5px] text-white/85 hover:bg-white/[0.06]"
    >
      <span
        className={
          value
            ? "h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_1px_rgba(52,211,153,0.65)]"
            : "h-2.5 w-2.5 rounded-full bg-white/25"
        }
      />
      {label}
    </button>
  );
}

function MobileCompanionCard() {
  const code = useAtlasStore((s) => s.pairingCode);
  const generate = useAtlasStore((s) => s.generatePairingCode);
  const clear = useAtlasStore((s) => s.clearPairing);

  const onCopy = () => {
    if (!code) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(code);
    }
  };

  return (
    <section className="rounded-2xl border border-accent/25 bg-accent/[0.04] p-4 shadow-glow">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Mobile Companion</span>
        </div>
        <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/55">
          planned · secure pairing
        </span>
      </header>

      <p className="text-[11.5px] text-white/65">
        The phone is a capture + approval device. Voice notes become mission
        briefs. Screenshots become context. Destructive actions (cloud
        spend, repo write-back, risky shell) always wait for your tap.
      </p>

      {/* Pairing code */}
      <div className="mt-3 flex flex-col gap-2 rounded-xl border border-white/10 bg-graphite-900/60 p-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
            pairing code
          </span>
          {code && (
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-1 rounded-md border border-rose-400/25 bg-rose-500/[0.06] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-rose-200 hover:bg-rose-500/[0.12]"
              title="Revoke pairing code"
            >
              <Trash2 className="h-2.5 w-2.5" /> revoke
            </button>
          )}
        </div>

        {code ? (
          <div className="flex flex-wrap items-center gap-3">
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border border-accent/30 bg-accent/[0.06] font-mono text-[10px] uppercase tracking-wider text-accent/80"
              title="QR placeholder · networking ships with the desktop runtime"
            >
              <QrCode className="h-10 w-10 text-accent" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[18px] tracking-[0.28em] text-white">
                {code}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onCopy}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/75 hover:bg-white/[0.06]"
                >
                  <Copy className="h-2.5 w-2.5" /> copy
                </button>
                <button
                  type="button"
                  onClick={generate}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/75 hover:bg-white/[0.06]"
                >
                  <RefreshCcw className="h-2.5 w-2.5" /> regenerate
                </button>
              </div>
              <p className="text-[10px] text-white/45">
                Code is generated and stored locally. Networking + QR scan
                land with the desktop runtime — no traffic leaves this machine yet.
              </p>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={generate}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-accent/85 px-3 py-1.5 text-[12px] font-semibold text-white shadow-glow transition hover:bg-accent"
          >
            <QrCode className="h-3.5 w-3.5" /> Generate pairing code
          </button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
        <Capability
          eyebrow="capture"
          title="Voice · screenshot · share-sheet"
          body="Send anything to your brain from any app. Lands in Mission Brief on the desktop."
        />
        <Capability
          eyebrow="approve"
          title="Risky actions require a tap"
          body="Cloud spend, repo writes, vetted shell commands wait on phone-side approval with full diff."
        />
        <Capability
          eyebrow="view"
          title="Receipts on the go"
          body="Open any past receipt · copy a deliverable · forward to a teammate."
        />
        <Capability
          eyebrow="dispatch"
          title="Lightweight templates"
          body="“Ask my Brain” · “Summarize this” · “Send to desktop” · “Create repo task”."
        />
      </div>

      <p className="mt-3 text-[10.5px] text-white/45">
        Mobile never runs the full Mission Control, never executes
        unapproved actions, and never pretends Ollama exists on phone.
      </p>
    </section>
  );
}

function Capability({
  eyebrow,
  title,
  body
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <article className="flex flex-col gap-1 rounded-xl border border-white/8 bg-white/[0.012] p-3">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
        {eyebrow}
      </span>
      <span className="text-[12.5px] font-semibold text-white">{title}</span>
      <span className="text-[11px] text-white/55">{body}</span>
    </article>
  );
}

"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Cpu,
  Eye,
  EyeOff,
  Key,
  ShieldCheck,
  Terminal as TerminalIcon
} from "lucide-react";
import { SurfaceHeader } from "@/components/primitives/SurfaceHeader";

/**
 * Settings surface.
 *
 * Honest, narrow first pass:
 *   - BYOK key fields for the three providers we route to (Anthropic /
 *     OpenAI / Google). Stored in component state only — wiring into
 *     the desktop keychain lands with the engine.
 *   - Local engine probe (Ollama host) — purely a label today.
 *   - Telemetry switch + safety screen toggle.
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
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-5 px-5 py-5 md:px-7 md:py-7">
      <SurfaceHeader
        eyebrow="settings · operator preferences"
        title="Settings"
        sub="BYOK keys, local engine, safety, telemetry. Keys you paste here stay in memory for this session only — keychain persistence lands when the desktop runtime ships."
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <article className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <header className="flex items-center gap-2">
            <Key className="h-3.5 w-3.5 text-accent" />
            <span className="text-[13px] font-semibold text-white">BYOK · provider keys</span>
          </header>
          <p className="text-[11px] text-white/55">
            Bring your own keys. Routing flips to your account when you fill
            them in. Local Ollama always works without keys.
          </p>
          <ProviderKeyRow label="Anthropic" placeholder="sk-ant-…" />
          <ProviderKeyRow label="OpenAI" placeholder="sk-…" />
          <ProviderKeyRow label="Google" placeholder="AIza…" />
          <p className="flex items-start gap-1.5 rounded-md border border-amber-400/25 bg-amber-500/[0.05] p-2 text-[10.5px] text-amber-200/80">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            Keys are stored in this preview's memory only. They vanish when
            you close the window.
          </p>
        </article>

        <article className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <header className="flex items-center gap-2">
            <Cpu className="h-3.5 w-3.5 text-accent" />
            <span className="text-[13px] font-semibold text-white">Local engine</span>
          </header>
          <p className="text-[11px] text-white/55">
            PromptReady OS prefers a local Ollama instance whenever a routable
            local model exists. The probe runs lazily on the first mission.
          </p>
          <div className="rounded-md border border-white/8 bg-white/[0.015] p-3 font-mono text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-white/45">ollama host</span>
              <span className="text-white">http://localhost:11434</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-white/45">status</span>
              <span className="text-white/55">unprobed</span>
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
            Off by default. When you turn it on, the desktop sends anonymous
            usage counts (missions dispatched, average latency) — never your
            brief content or deliverables.
          </p>
          <Toggle
            value={telemetry}
            onToggle={() => setTelemetry((v) => !v)}
            label={telemetry ? "Sharing anonymous counts" : "Off"}
          />
        </article>
      </section>
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

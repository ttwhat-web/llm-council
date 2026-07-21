"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ShieldCheck, ShieldOff } from "lucide-react";
import { useMissionStore } from "@/store/mission";
import { useAtlasStore } from "@/store/atlas";
import { downloadSnapshot } from "@/services/snapshot";
import { auditLog } from "@/services/auditLog";
import { readPresentationFlags } from "@/components/PresentationModeCard";

/**
 * Operator Safe Mode · S1.1
 *
 * One tap that composes existing primitives — does NOT introduce any
 * new runtime concept:
 *
 *   · cancel current mission (if any)
 *   · take a Brain freeze snapshot
 *   · enable Presentation Mode flags (silent + demoLock)
 *   · set a `safe-mode` flag in localStorage
 *
 * Same tap exits safe mode (without restoring the snapshot — that's
 * the existing Restore freeze button next to Presentation Mode).
 *
 * Pure composition. No store migrations.
 */

const KEY = "promptready-os.safe-mode";
const PRESENTATION_KEY = "promptready-os.presentation-mode";

interface SafeModeState {
  on: boolean;
  enteredAt: number | null;
}

function readState(): SafeModeState {
  if (typeof window === "undefined") return { on: false, enteredAt: null };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { on: false, enteredAt: null };
    return JSON.parse(raw) as SafeModeState;
  } catch {
    return { on: false, enteredAt: null };
  }
}

function writeState(s: SafeModeState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

function writePresentationFlags(silent: boolean, demoLock: boolean) {
  if (typeof window === "undefined") return;
  try {
    const cur = readPresentationFlags();
    const next = { ...cur, silent, demoLock };
    window.localStorage.setItem(PRESENTATION_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function OperatorSafeModeCard() {
  const [state, setState] = useState<SafeModeState>(() => readState());
  const cancel = useMissionStore((s) => s.cancel);
  const current = useMissionStore((s) => s.current);
  const setAgentState = useAtlasStore((s) => s.setAgentState);
  const agents = useAtlasStore((s) => s.agents);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    writeState(state);
  }, [state]);

  const enter = () => {
    // 1. cancel any in-flight mission
    if (current) cancel();
    // 2. flag every agent as blocked (visual cue, no enforcement yet)
    for (const a of agents) {
      if (a.state === "running" || a.state === "waiting") {
        setAgentState(a.kind, "blocked");
      }
    }
    // 3. drop a Brain freeze (in-memory + downloaded)
    let frozenFile: string | undefined;
    try {
      const r = downloadSnapshot("safe-mode-entry");
      frozenFile = r.filename;
    } catch {
      // ignore — snapshot is best effort
    }
    // 4. flip presentation flags (silent + demoLock)
    writePresentationFlags(true, true);
    // 5. persist
    const now = Date.now();
    setState({ on: true, enteredAt: now });
    auditLog("policy.toggle", {
      key: "safe-mode",
      on: true,
      missionCancelled: current?.id ?? null,
      snapshot: frozenFile ?? null
    });
    setFlash(
      `SAFE MODE active · ${current ? "mission cancelled · " : ""}${frozenFile ? "brain frozen · " : ""}silent + demo lock on`
    );
    window.setTimeout(() => setFlash(null), 6000);
  };

  const exit = () => {
    // Leave presentation flags as-is so the operator can choose to keep
    // silent/demoLock independently. Just turn off Safe Mode.
    setState({ on: false, enteredAt: null });
    auditLog("policy.toggle", { key: "safe-mode", on: false });
    setFlash("SAFE MODE off · presentation flags untouched");
    window.setTimeout(() => setFlash(null), 4000);
  };

  return (
    <section
      className={
        state.on
          ? "rounded-2xl border border-rose-400/40 bg-rose-500/[0.05] p-4 shadow-glow"
          : "rounded-2xl border border-white/10 bg-white/[0.02] p-4"
      }
    >
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {state.on ? (
            <ShieldCheck className="h-4 w-4 text-rose-200" />
          ) : (
            <ShieldOff className="h-4 w-4 text-accent" />
          )}
          <span className="text-[13px] font-semibold text-white">
            Operator Safe Mode
          </span>
        </div>
        <span
          className={
            state.on
              ? "rounded border border-rose-400/30 bg-rose-500/[0.1] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-rose-200"
              : "rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/55"
          }
        >
          {state.on ? "active" : "off"}
        </span>
      </header>

      <p className="text-[11.5px] text-white/65">
        One tap. Cancels the in-flight mission, flips running agents to
        blocked, takes a Brain freeze snapshot, enables silent + demo
        lock. No store migrations · everything reuses existing
        primitives.
      </p>

      <ul className="mt-3 flex flex-col gap-1 text-[11px] text-white/75">
        <Bullet ok={!current}>cancels current mission</Bullet>
        <Bullet ok>blocks running agents</Bullet>
        <Bullet ok>downloads + in-memory Brain freeze</Bullet>
        <Bullet ok>turns on Silent + Demo lock</Bullet>
      </ul>

      {state.on ? (
        <button
          type="button"
          onClick={exit}
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/[0.08] px-3 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/[0.16]"
        >
          <ShieldOff className="h-4 w-4" /> Exit Safe Mode
        </button>
      ) : (
        <button
          type="button"
          onClick={enter}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-rose-500/90 px-3 py-2 text-sm font-semibold text-white shadow-glow transition hover:bg-rose-500"
        >
          <AlertTriangle className="h-4 w-4" />
          Enter Safe Mode
        </button>
      )}

      {state.on && state.enteredAt && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-rose-200/80">
          entered {new Date(state.enteredAt).toLocaleString()}
        </p>
      )}

      {flash && (
        <p className="mt-2 rounded-md border border-accent/30 bg-accent/[0.08] px-2 py-1 font-mono text-[10.5px] uppercase tracking-wider text-accent">
          {flash}
        </p>
      )}
    </section>
  );
}

function Bullet({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={
          ok
            ? "h-1 w-1 shrink-0 rounded-full bg-emerald-400"
            : "h-1 w-1 shrink-0 rounded-full bg-white/35"
        }
      />
      <span>{children}</span>
    </li>
  );
}

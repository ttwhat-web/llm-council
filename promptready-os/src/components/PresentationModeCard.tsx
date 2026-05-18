"use client";

import { useEffect, useState } from "react";
import {
  EyeOff,
  Lock,
  Loader2,
  RotateCcw,
  Snowflake,
  Sparkles,
  VolumeX
} from "lucide-react";
import { downloadSnapshot, restoreSnapshotById } from "@/services/snapshot";
import { useAtlasStore } from "@/store/atlas";
import { auditLog } from "@/services/auditLog";

/**
 * Presentation Mode card · safe-by-design demo helper.
 *
 * Four toggles + one button + one restore, all local:
 *
 *   · Silent      · suppresses the notifications bell badge
 *   · Ghost       · redacts email-shaped strings in labels
 *   · Demo lock   · warns before any destructive action
 *   · Brain freeze · snapshot the current state as "presentation-freeze"
 *   · Restore freeze · one-tap revert
 *
 * Every flag persists to localStorage so the HUD bell / labels / atlas
 * can read the same posture. No store migrations · no runtime rewrites.
 */

const KEY = "promptready-os.presentation-mode";

interface PresentationFlags {
  silent: boolean;
  ghost: boolean;
  demoLock: boolean;
  freezeId: string | null;
}

const DEFAULTS: PresentationFlags = {
  silent: false,
  ghost: false,
  demoLock: false,
  freezeId: null
};

export function readPresentationFlags(): PresentationFlags {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<PresentationFlags>) };
  } catch {
    return DEFAULTS;
  }
}

function saveFlags(flags: PresentationFlags) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(flags));
  } catch {
    // ignore
  }
}

export function isPresentationActive(): boolean {
  const f = readPresentationFlags();
  return f.silent || f.ghost || f.demoLock;
}

export function PresentationModeCard() {
  const [flags, setFlags] = useState<PresentationFlags>(() => readPresentationFlags());
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const recentSnapshots = useAtlasStore((s) => s.recentSnapshotPayloads);

  useEffect(() => {
    saveFlags(flags);
  }, [flags]);

  const toggle = (key: keyof Pick<PresentationFlags, "silent" | "ghost" | "demoLock">) => {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const onFreeze = () => {
    setBusy(true);
    try {
      const r = downloadSnapshot("presentation-freeze");
      // Capture the latest in-memory snapshot's id (recordSnapshot puts it
      // at index 0). We read after the dispatch microtask so the store has
      // updated.
      window.setTimeout(() => {
        const latest = useAtlasStore.getState().snapshots[0];
        if (latest) {
          setFlags((prev) => ({ ...prev, freezeId: latest.id }));
        }
      }, 50);
      setFlash(`brain frozen · ${r.filename} also kept in memory for one-tap restore`);
      auditLog("snapshot.export", { source: "presentation-freeze", filename: r.filename });
    } finally {
      setBusy(false);
      window.setTimeout(() => setFlash(null), 4000);
    }
  };

  const onRestoreFreeze = () => {
    if (!flags.freezeId) return;
    const ok = restoreSnapshotById(flags.freezeId);
    if (ok) {
      setFlash("workspace restored to presentation freeze");
      auditLog("snapshot.restore", { source: "presentation-freeze" });
    } else {
      setFlash("freeze payload no longer in memory · use file restore in Snapshots card");
    }
    window.setTimeout(() => setFlash(null), 5000);
  };

  const hasFreezeInMemory = !!(
    flags.freezeId && recentSnapshots.find((p) => p.id === flags.freezeId)
  );

  return (
    <section className="rounded-2xl border border-accent/25 bg-accent/[0.04] p-4 shadow-glow">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Presentation Mode</span>
        </div>
        <span
          className={
            isPresentationActive()
              ? "rounded border border-accent/40 bg-accent/[0.1] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-accent"
              : "rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/55"
          }
        >
          {isPresentationActive() ? "active" : "off"}
        </span>
      </header>

      <p className="text-[11.5px] text-white/65">
        Safe-by-design demo helpers. Each toggle persists locally · they
        don't migrate stores, don't move Atlas, don't redesign anything.
        Use this before going on stage.
      </p>

      <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
        <Toggle
          Icon={VolumeX}
          label="Silent mode"
          hint="HUD bell suppressed · alerts queued but quiet"
          on={flags.silent}
          onClick={() => toggle("silent")}
        />
        <Toggle
          Icon={EyeOff}
          label="Ghost mode"
          hint="Redact email-shaped strings in visible labels"
          on={flags.ghost}
          onClick={() => toggle("ghost")}
        />
        <Toggle
          Icon={Lock}
          label="Demo lock"
          hint="Warn before any destructive action"
          on={flags.demoLock}
          onClick={() => toggle("demoLock")}
        />
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-white/10 bg-graphite-900/60 p-3">
        <Snowflake className="h-3.5 w-3.5 text-accent" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-[12px] font-semibold text-white">Brain freeze</span>
          <span className="text-[10.5px] text-white/55">
            Snapshot the current workspace as a presentation freeze. One-tap
            restore even if the demo wanders.
          </span>
        </div>
        <button
          type="button"
          onClick={onFreeze}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent/90 px-2.5 py-1.5 text-[11.5px] font-semibold text-white shadow-glow transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Snowflake className="h-3 w-3" />}
          Freeze brain
        </button>
        <button
          type="button"
          onClick={onRestoreFreeze}
          disabled={!hasFreezeInMemory}
          title={
            hasFreezeInMemory
              ? "restore from in-memory freeze"
              : "no in-memory freeze · use Snapshots card to restore from file"
          }
          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-white/75 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RotateCcw className="h-3 w-3" /> restore freeze
        </button>
      </div>

      {flash && (
        <p className="mt-2 rounded-md border border-accent/30 bg-accent/[0.08] px-2 py-1 font-mono text-[10.5px] uppercase tracking-wider text-accent">
          {flash}
        </p>
      )}

      <p className="mt-3 text-[10px] text-white/45">
        Presentation Mode is opt-in · nothing is hidden from you that
        wasn't on screen a tap ago. Disable any toggle to revert
        immediately.
      </p>
    </section>
  );
}

function Toggle({
  Icon,
  label,
  hint,
  on,
  onClick
}: {
  Icon: typeof Sparkles;
  label: string;
  hint: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={
          on
            ? "flex w-full flex-col items-start gap-1 rounded-xl border border-accent/40 bg-accent/[0.08] p-3 shadow-glow"
            : "flex w-full flex-col items-start gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-3 hover:border-accent/25 hover:bg-white/[0.04]"
        }
      >
        <div className="flex items-center gap-1.5">
          <Icon className={on ? "h-3.5 w-3.5 text-accent" : "h-3.5 w-3.5 text-white/65"} />
          <span className={on ? "text-[12.5px] font-semibold text-white" : "text-[12.5px] text-white/85"}>
            {label}
          </span>
          <span
            className={
              on
                ? "rounded border border-accent/30 bg-accent/[0.1] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-accent"
                : "rounded border border-white/10 bg-white/[0.03] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-white/55"
            }
          >
            {on ? "on" : "off"}
          </span>
        </div>
        <span className="text-[10.5px] text-white/55">{hint}</span>
      </button>
    </li>
  );
}

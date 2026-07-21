"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import type { FixResponse } from "@/lib/types";
import type { StageEvent, StageId, StageStatus } from "@/lib/pipeline/types";

/**
 * Live pipeline visualization — the horizontal stage strip that runs under
 * the input area while a request is in flight.
 *
 * Stages mirror lib/pipeline/prompt-fixer-stages.ts (the six typed Stages
 * the Prompt Fixer pipeline emits real events for):
 *
 *   INPUT → CLEAN → INTENT → STRUCTURE → CONSTRAINTS → GENERATE → VALIDATE → OUTPUT
 *
 * When the response arrives with `events`, each chip reflects the real
 * terminal status reported by that stage (no inference). The synthetic
 * INPUT and OUTPUT bookends are derived from the run as a whole.
 */

export type StageState =
  | "idle"
  | "scanning"
  | "active"
  | "complete"
  | "fallback"
  | "warning";

interface Stage {
  id: StageId;
  label: string;
  short: string;
}

const STAGES: Stage[] = [
  { id: "input", label: "INPUT", short: "IN" },
  { id: "clean", label: "CLEAN", short: "CL" },
  { id: "intent", label: "INTENT", short: "IT" },
  { id: "structure", label: "STRUCTURE", short: "ST" },
  { id: "constraints", label: "CONSTRAINTS", short: "CN" },
  { id: "generate", label: "GENERATE", short: "GN" },
  { id: "validate", label: "VALIDATE", short: "VL" },
  { id: "output", label: "OUTPUT", short: "OUT" }
];

interface Props {
  busy: boolean;
  result: FixResponse | null;
  autoMode: boolean;
  compact?: boolean;
}

export function PipelineViz({ busy, result, autoMode, compact }: Props) {
  const [walk, setWalk] = useState(0);

  // Walking-light cadence while we wait. Loops if the response is slower
  // than the animation.
  useEffect(() => {
    if (!busy) {
      setWalk(0);
      return;
    }
    const id = window.setInterval(() => {
      setWalk((w) => (w + 1) % (STAGES.length + 1));
    }, 140);
    return () => window.clearInterval(id);
  }, [busy]);

  const states = computeStates(busy, walk, result, autoMode);

  return (
    <div
      className={clsx(
        "rounded-2xl border border-white/6 bg-white/[0.02] px-3 py-2.5",
        compact && "px-2 py-2"
      )}
    >
      <div className="flex items-center justify-between pb-1.5">
        <div className="text-[9px] font-medium uppercase tracking-[0.18em] text-white/40">
          Pipeline
        </div>
        <div className="text-[9px] font-mono uppercase tracking-wider text-white/35">
          {busy ? "running" : result ? `${result.elapsedMs}ms` : "idle"}
        </div>
      </div>

      <div className="flex items-center gap-0">
        {STAGES.map((s, i) => (
          <div key={s.id} className="flex flex-1 items-center">
            <StageChip stage={s} state={states[i]} compact={compact} />
            {i < STAGES.length - 1 && (
              <Connector
                active={states[i] === "complete" && states[i + 1] !== "idle"}
                tone={connectorTone(states[i], states[i + 1])}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- chip + connector ----------

function StageChip({
  stage,
  state,
  compact
}: {
  stage: Stage;
  state: StageState;
  compact?: boolean;
}) {
  const cls = stateClasses(state);
  return (
    <div
      className={clsx(
        "flex flex-col items-center gap-1 rounded-lg px-1.5 py-1.5 transition",
        cls.bg
      )}
      title={stage.label}
    >
      <span className={clsx("relative h-1.5 w-1.5 rounded-full", cls.dot)}>
        {(state === "scanning" || state === "active") && (
          <span className={clsx("absolute inset-0 rounded-full animate-ping", cls.ping)} />
        )}
      </span>
      <span
        className={clsx(
          "font-mono text-[9px] uppercase tracking-[0.1em] transition",
          compact ? "text-[8px]" : "text-[9px]",
          cls.text
        )}
      >
        {compact ? stage.short : stage.label}
      </span>
    </div>
  );
}

function Connector({ active, tone }: { active: boolean; tone: "ok" | "warn" | "muted" }) {
  return (
    <div className="flex flex-1 items-center px-0.5">
      <div
        className={clsx(
          "h-px w-full transition-all",
          active
            ? tone === "ok"
              ? "bg-emerald-400/60"
              : tone === "warn"
                ? "bg-amber-400/60"
                : "bg-white/15"
            : "bg-white/8"
        )}
      />
    </div>
  );
}

// ---------- state computation ----------

function computeStates(
  busy: boolean,
  walk: number,
  result: FixResponse | null,
  autoMode: boolean
): StageState[] {
  if (busy) {
    // Walking light — index `walk` is "active", everything before is
    // tentatively complete, everything after is scanning (dim pulse).
    return STAGES.map((_, i) => {
      if (i < walk) return "complete";
      if (i === walk) return "active";
      return "scanning";
    });
  }

  if (!result) return STAGES.map(() => "idle");

  // Real events drive the chips when the pipeline reported them.
  if (result.events && result.events.length > 0) {
    return STAGES.map((stage) => stateFromEvents(stage.id, result));
  }

  // Fallback for callers that didn't emit events (back-compat path).
  return inferStatesFromResult(result, autoMode);
}

function stateFromEvents(stageId: StageId, result: FixResponse): StageState {
  if (stageId === "input") return "complete";
  if (stageId === "output") return result.ok ? "complete" : "warning";

  const events = result.events ?? [];
  // Take the latest event for this stage — it's the terminal status.
  let latest: StageEvent | undefined;
  for (const e of events) if (e.stage === stageId) latest = e;
  if (!latest) return "idle";
  return mapStatus(latest.status);
}

function mapStatus(status: StageStatus): StageState {
  switch (status) {
    case "active":
    case "scanning":
    case "complete":
    case "fallback":
    case "warning":
      return status;
    case "idle":
    default:
      return "idle";
  }
}

/**
 * Legacy fallback: derive stage states from the FixResponse fields when
 * the response lacks a real events stream.
 */
function inferStatesFromResult(result: FixResponse, autoMode: boolean): StageState[] {
  const sup = result.supervisor;
  const safetyHas = result.safety.findings.length > 0;
  const intentState: StageState = autoMode ? "complete" : "complete";
  const generateState: StageState = sup.error
    ? "warning"
    : sup.fallbackUsed
      ? "fallback"
      : "complete";
  const validateState: StageState =
    result.safety.blocked || safetyHas ? "warning" : "complete";

  return [
    "complete", // INPUT
    "complete", // CLEAN
    intentState, // INTENT
    "complete", // STRUCTURE
    "complete", // CONSTRAINTS
    generateState, // GENERATE
    validateState, // VALIDATE
    "complete" // OUTPUT
  ];
}

function stateClasses(state: StageState): {
  dot: string;
  ping: string;
  bg: string;
  text: string;
} {
  switch (state) {
    case "active":
      return {
        dot: "bg-accent shadow-[0_0_8px_2px_rgba(124,155,255,0.6)]",
        ping: "bg-accent/45",
        bg: "bg-accent/[0.07]",
        text: "text-accent"
      };
    case "scanning":
      return {
        dot: "bg-white/30",
        ping: "bg-white/15",
        bg: "",
        text: "text-white/35"
      };
    case "complete":
      return {
        dot: "bg-emerald-400 shadow-[0_0_6px_1px_rgba(52,211,153,0.5)]",
        ping: "",
        bg: "",
        text: "text-white/75"
      };
    case "fallback":
      return {
        dot: "bg-amber-400 shadow-[0_0_6px_1px_rgba(251,191,36,0.45)]",
        ping: "",
        bg: "bg-amber-500/[0.06]",
        text: "text-amber-200"
      };
    case "warning":
      return {
        dot: "bg-orange-400 shadow-[0_0_6px_1px_rgba(251,146,60,0.5)]",
        ping: "",
        bg: "bg-orange-500/[0.05]",
        text: "text-orange-200"
      };
    case "idle":
    default:
      return {
        dot: "bg-white/15",
        ping: "",
        bg: "",
        text: "text-white/30"
      };
  }
}

function connectorTone(prev: StageState, next: StageState): "ok" | "warn" | "muted" {
  if (prev === "warning" || next === "warning") return "warn";
  if (prev === "fallback" || next === "fallback") return "warn";
  if (prev === "complete" && next !== "idle") return "ok";
  return "muted";
}

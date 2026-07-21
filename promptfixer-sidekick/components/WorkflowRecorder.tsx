"use client";

import { useState } from "react";
import clsx from "clsx";
import { ChevronDown, ChevronRight, Circle, Pause, Save, Trash2 } from "lucide-react";
import type {
  RecordedStep,
  RecordedStepKind,
  RecordingDraft
} from "@/lib/recorder";

/**
 * Workflow Recorder MVP surface.
 *
 * Three states the panel renders:
 *
 *   - Idle (recording disabled, no steps captured this session)
 *   - Recording (red dot, live step list, "Stop" button)
 *   - Stopped with steps (Save draft / Discard / Resume)
 *
 * Saved drafts are listed at the bottom for delete + browse. Replay is
 * intentionally not yet wired (see lib/recorder.ts header comment); the
 * panel never claims a draft is "runnable", only "saved".
 */

interface Props {
  enabled: boolean;
  steps: RecordedStep[];
  drafts: RecordingDraft[];
  onToggle: (next: boolean) => void;
  onSave: (name: string) => void;
  onClear: () => void;
  onDeleteDraft: (id: string) => void;
  compact?: boolean;
}

export function WorkflowRecorder({
  enabled,
  steps,
  drafts,
  onToggle,
  onSave,
  onClear,
  onDeleteDraft,
  compact
}: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const hasSteps = steps.length > 0;

  return (
    <section
      className={clsx(
        "rounded-2xl border bg-white/[0.012] transition",
        enabled ? "border-rose-400/30" : "border-white/6",
        compact && "text-[11px]"
      )}
    >
      <header className="flex items-center justify-between gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-1.5 text-left transition hover:text-white"
        >
          {open ? (
            <ChevronDown className="h-3 w-3 text-white/40" />
          ) : (
            <ChevronRight className="h-3 w-3 text-white/40" />
          )}
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/55">
            Workflow Recorder
          </span>
          {enabled && (
            <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-rose-300">
              <span className="relative h-1.5 w-1.5 rounded-full bg-rose-400">
                <span className="absolute inset-0 animate-ping rounded-full bg-rose-400/55" />
              </span>
              REC
            </span>
          )}
          <span className="ml-auto font-mono text-[9px] uppercase tracking-wider text-white/35">
            {steps.length} step{steps.length === 1 ? "" : "s"}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onToggle(!enabled)}
          className={clsx(
            "no-drag inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider transition",
            enabled
              ? "border-rose-400/40 bg-rose-500/[0.1] text-rose-200 hover:bg-rose-500/[0.16]"
              : "border-accent/30 bg-accent/[0.08] text-accent hover:bg-accent/[0.16]"
          )}
        >
          {enabled ? (
            <>
              <Pause className="h-3 w-3" />
              Stop
            </>
          ) : (
            <>
              <Circle className="h-3 w-3" />
              Record
            </>
          )}
        </button>
      </header>

      {open && (
        <div className="flex flex-col gap-2 border-t border-white/5 px-3 py-2.5">
          {hasSteps ? (
            <ol className="flex flex-col gap-1">
              {steps.map((s, i) => (
                <li
                  key={s.id}
                  className="flex items-start gap-2 rounded-md border border-white/6 bg-white/[0.02] px-2 py-1"
                >
                  <span className="mt-0.5 font-mono text-[9px] text-white/40">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex flex-1 flex-col leading-tight">
                    <span className="text-[11.5px] text-white/85">{s.label}</span>
                    {s.payload && (
                      <span className="font-mono text-[9px] text-white/40">
                        {kindGlyph(s.kind)} {s.kind}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[11px] text-white/45">
              {enabled
                ? "Recording — perform a Fix, Clean, Architect or Skill run to capture steps."
                : "Idle. Tap Record to start capturing your actions as a draft workflow."}
            </p>
          )}

          {hasSteps && (
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name this recording…"
                className="no-drag flex-1 rounded-md border border-white/8 bg-white/[0.025] px-2 py-1 text-[11px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
              />
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onSave(name);
                    setName("");
                  }}
                  className="no-drag inline-flex items-center gap-1 rounded-md border border-emerald-400/35 bg-emerald-500/[0.08] px-2 py-1 text-[10px] font-medium text-emerald-200 transition hover:bg-emerald-500/[0.14]"
                >
                  <Save className="h-3 w-3" />
                  Save draft
                </button>
                <button
                  type="button"
                  onClick={onClear}
                  className="no-drag inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] font-medium text-white/70 transition hover:bg-white/[0.06]"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {drafts.length > 0 && (
            <div className="border-t border-white/5 pt-2">
              <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-white/35">
                Saved drafts
              </span>
              <ul className="mt-1 flex flex-col divide-y divide-white/5">
                {drafts.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center gap-2 py-1 first:pt-0 last:pb-0"
                  >
                    <div className="flex flex-1 flex-col leading-tight">
                      <span className="truncate text-[11.5px] text-white/85">{d.name}</span>
                      <span className="font-mono text-[9px] text-white/40">
                        {d.steps.length} step{d.steps.length === 1 ? "" : "s"} ·{" "}
                        {new Date(d.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <span className="rounded border border-white/8 bg-white/[0.02] px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-wider text-white/40">
                      draft
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteDraft(d.id)}
                      className="no-drag flex h-5 w-5 items-center justify-center rounded-md border border-white/8 bg-white/[0.02] text-rose-300/65 transition hover:border-rose-400/40 hover:bg-rose-500/[0.08] hover:text-rose-200"
                      title="Delete draft"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-[10px] text-white/35">
                Drafts are saved locally. Replay lands once the runner
                accepts free-form recordings; until then drafts are review-only.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function kindGlyph(kind: RecordedStepKind): string {
  switch (kind) {
    case "fix":
      return "→";
    case "clean":
      return "≈";
    case "architect":
      return "⌘";
    case "run-skill":
      return "✦";
    case "run-workflow":
      return "⤳";
    case "copy":
      return "⧉";
    default:
      return "·";
  }
}

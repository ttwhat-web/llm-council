"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Hammer, Lightbulb, Loader2, Sparkles, Wand2 } from "lucide-react";
import { classifyInput, type SkillSuggestion } from "@/lib/skills/classifier";
import type { SkillId } from "@/lib/skills/types";

/**
 * Live skill suggestions strip.
 *
 * The classifier (lib/skills/classifier.ts) is pure JS, runs client-side
 * on a 160ms debounce. We cap the rendered list at 3 chips and refuse
 * to show any chip below the classifier's MIN_SCORE so the UI never
 * recommends an irrelevant skill.
 */

interface Props {
  input: string;
  busySkillId: SkillId | null;
  onPick: (skillId: SkillId) => void;
  compact?: boolean;
}

const ICON: Record<SkillId, typeof Wand2> = {
  "prompt-fixer": Wand2,
  "prompt-cleaner": Sparkles,
  architect: Hammer,
  // Planned skills never reach the suggestions surface (classifier only
  // ranks shipped). Mapped here so the type stays exhaustive.
  "code-debugger": Lightbulb,
  "ai-researcher": Lightbulb,
  "crypto-analyst": Lightbulb,
  "screenshot-analyzer": Lightbulb,
  "terminal-assistant": Lightbulb,
  "deployment-assistant": Lightbulb,
  "marketing-generator": Lightbulb,
  "outreach-agent": Lightbulb,
  "vision-analyzer": Lightbulb,
  "workflow-builder": Lightbulb
};

const LABEL: Record<SkillId, string> = {
  "prompt-fixer": "Prompt Fixer",
  "prompt-cleaner": "Prompt Cleaner",
  architect: "Architect",
  "code-debugger": "Code Debugger",
  "ai-researcher": "AI Researcher",
  "crypto-analyst": "Crypto Analyst",
  "screenshot-analyzer": "Screenshot Analyzer",
  "terminal-assistant": "Terminal Assistant",
  "deployment-assistant": "Deployment Assistant",
  "marketing-generator": "Marketing Generator",
  "outreach-agent": "Outreach Agent",
  "vision-analyzer": "Vision Analyzer",
  "workflow-builder": "Workflow Builder"
};

export function SkillSuggestions({ input, busySkillId, onPick, compact }: Props) {
  const [debounced, setDebounced] = useState(input);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(input), 160);
    return () => window.clearTimeout(t);
  }, [input]);

  const suggestions = useMemo<SkillSuggestion[]>(
    () => classifyInput(debounced, { topN: 3 }),
    [debounced]
  );

  if (suggestions.length === 0) return null;

  return (
    <div
      className={clsx(
        "flex flex-wrap items-center gap-1.5 rounded-xl border border-white/6 bg-white/[0.015] px-2 py-1.5",
        compact && "gap-1 px-1.5 py-1"
      )}
    >
      <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/35">
        suggested
      </span>
      {suggestions.map((s) => {
        const Icon = ICON[s.skillId];
        const busy = busySkillId === s.skillId;
        const reason = s.reasons[0];
        return (
          <button
            key={s.skillId}
            type="button"
            disabled={busy}
            onClick={() => onPick(s.skillId)}
            title={
              s.reasons.length > 0
                ? `${s.score}/100 · ${s.reasons.join(" · ")}`
                : `${s.score}/100`
            }
            className={clsx(
              "no-drag inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium transition",
              busy
                ? "border-accent/40 bg-accent/[0.12] text-accent"
                : "border-white/8 bg-white/[0.04] text-white/80 hover:border-accent/30 hover:bg-accent/[0.08] hover:text-accent",
              "disabled:cursor-not-allowed"
            )}
          >
            {busy ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Icon className="h-3 w-3" />
            )}
            {LABEL[s.skillId]}
            {!busy && reason && (
              <span className="ml-1 hidden font-mono text-[9px] uppercase tracking-wider text-white/35 md:inline">
                {reason.length > 18 ? reason.slice(0, 17) + "…" : reason}
              </span>
            )}
            <span className="ml-1 rounded bg-white/[0.05] px-1 font-mono text-[9px] text-white/55">
              {s.score}
            </span>
          </button>
        );
      })}
    </div>
  );
}

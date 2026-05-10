"use client";

import clsx from "clsx";
import { AlertTriangle, ClipboardPaste, Lightbulb, Terminal } from "lucide-react";
import type { Mode } from "@/lib/types";

/**
 * Onboarding example chips rendered above (or in place of) the
 * textarea when the input is empty. Clicking an example fills the
 * textarea with a representative payload and (optionally) sets the
 * mode + autoMode flag so the user lands somewhere productive.
 */

interface Example {
  id: string;
  label: string;
  body: string;
  Icon: typeof Lightbulb;
  /** Mode the example demonstrates — used by the parent to set state. */
  mode?: Mode;
  /** Whether autoMode should stay on (default true). */
  autoMode?: boolean;
}

const EXAMPLES: Example[] = [
  {
    id: "messy-prompt",
    label: "Paste messy prompt",
    Icon: ClipboardPaste,
    autoMode: true,
    body:
      "i want u to act as my marketing copywriter and write me a viral tweet for my new app called PromptFixer it cleans up sloppy prompts and turns them into command‑center grade outputs make it punchy use emojis idk you decide audience is solo devs / indie hackers"
  },
  {
    id: "stack-trace",
    label: "Paste stack trace",
    Icon: AlertTriangle,
    mode: "dev",
    autoMode: false,
    body: `TypeError: Cannot read properties of undefined (reading 'map')
    at OutputTabs (components/OutputTabs.tsx:59:35)
    at renderWithHooks (react-dom.development.js:16305:18)
    at mountIndeterminateComponent (react-dom.development.js:20074:13)

Help me debug this. The component renders correctly on the first request but throws on the second. The 'architect' state is null until the user clicks Architect.`
  },
  {
    id: "product-idea",
    label: "Paste product idea",
    Icon: Lightbulb,
    autoMode: true,
    body:
      "I want to build a tool that watches my GitHub PRs, summarises the diff in plain English, and posts the summary back as a review comment. Should support monorepos, run on a daily schedule, and offer a paid tier with team-level dashboards."
  },
  {
    id: "terminal-error",
    label: "Paste terminal error",
    Icon: Terminal,
    mode: "terminal",
    autoMode: false,
    body: `$ pnpm install
ERR_PNPM_PEER_DEP_ISSUES  Unmet peer dependencies
└─ react@19 ‹—  required by @types/react-dom@18

What's the safest way to resolve this without breaking the existing Next 14 app?`
  }
];

interface Props {
  onPick: (body: string, mode: Mode | undefined, autoMode: boolean) => void;
  compact?: boolean;
}

export function EmptyStateExamples({ onPick, compact }: Props) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-dashed border-white/10 bg-white/[0.012] px-3 py-2.5",
        compact && "px-2 py-2"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-white/45">
          Start with an example
        </span>
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/30">
          tap to load
        </span>
      </div>
      <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.id}
            type="button"
            onClick={() => onPick(ex.body, ex.mode, ex.autoMode ?? true)}
            className="no-drag flex items-start gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-2 py-1.5 text-left transition hover:border-accent/30 hover:bg-accent/[0.06]"
          >
            <ex.Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent/85" />
            <div className="flex flex-col leading-tight">
              <span className="text-[12px] font-medium text-white/85">{ex.label}</span>
              <span className="mt-0.5 line-clamp-2 text-[10.5px] text-white/45">
                {ex.body.replace(/\s+/g, " ").slice(0, 80)}…
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

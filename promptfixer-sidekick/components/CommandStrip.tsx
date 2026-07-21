"use client";

import clsx from "clsx";
import type { CommandAction } from "./CommandBar";

/**
 * Always-visible command strip in the top header. Each chip is a single
 * tap-to-fire slash command. ⌘K opens the full palette.
 *
 * The strip dispatches the same `CommandAction` bus PromptFixer already
 * handles, so behaviour stays unified with the palette.
 */

interface Props {
  onOpen: () => void;
  onPrefilled: (q: string) => void;
  onCommand: (action: CommandAction) => void;
  compact?: boolean;
}

interface Chip {
  id: string;
  label: string;
  hint: string;
  fire?: (api: Pick<Props, "onOpen" | "onPrefilled" | "onCommand">) => void;
}

const CHIPS: Chip[] = [
  {
    id: "fix",
    label: "/fix",
    hint: "Run a fresh prompt fix",
    fire: ({ onCommand }) => onCommand({ kind: "run-fix" })
  },
  {
    id: "architect",
    label: "/architect",
    hint: "Prompt → architecture, stack, file tree",
    fire: ({ onCommand }) => onCommand({ kind: "run-architect" })
  },
  {
    id: "compare",
    label: "/compare",
    hint: "Side-by-side: Claude · ChatGPT · Cursor · Gemini",
    fire: ({ onCommand }) => onCommand({ kind: "compare" })
  },
  {
    id: "as400",
    label: "/as400",
    hint: "Switch mode → AS400 / IBM i",
    fire: ({ onCommand }) => onCommand({ kind: "set-mode", mode: "as400" })
  },
  {
    id: "cursor",
    label: "/cursor",
    hint: "Switch mode → Cursor (file paths + diffs)",
    fire: ({ onCommand }) => onCommand({ kind: "set-mode", mode: "cursor" })
  },
  {
    id: "export",
    label: "/export",
    hint: "Open the command bar to export",
    fire: ({ onPrefilled }) => onPrefilled("export")
  }
];

export function CommandStrip({ onOpen, onPrefilled, onCommand, compact }: Props) {
  return (
    <div
      className={clsx(
        "flex flex-wrap items-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.018] px-2 py-1.5 shadow-[inset_0_1px_0_rgba(230,230,250,0.04)]",
        compact && "px-1.5 py-1"
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="no-drag inline-flex items-center gap-1 rounded-md border border-accent/35 bg-accent/[0.10] px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider text-accent transition hover:border-accent/55 hover:bg-accent/[0.18]"
        title="Command palette (Cmd/Ctrl + K)"
      >
        <span>⌘K</span>
      </button>
      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
        commands
      </span>
      <span className="text-white/15">·</span>
      <div className="flex flex-wrap items-center gap-1">
        {CHIPS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => c.fire?.({ onOpen, onPrefilled, onCommand })}
            title={c.hint}
            className="no-drag rounded-md border border-white/[0.07] bg-white/[0.025] px-2 py-0.5 font-mono text-[11px] text-white/70 transition hover:-translate-y-px hover:border-accent/35 hover:bg-accent/[0.08] hover:text-accent"
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

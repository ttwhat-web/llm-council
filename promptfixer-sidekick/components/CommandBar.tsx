"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import {
  Bug,
  Cog,
  Cpu,
  Cpu as CpuIcon,
  Eye,
  GitBranch,
  Hammer,
  Layers,
  Sparkles,
  Terminal,
  Wand2,
  X
} from "lucide-react";
import type { Mode } from "@/lib/types";

/**
 * ⌘K command palette. Keyboard-first, Raycast-style, no animations
 * heavier than a quick fade. Each command translates into one of:
 *
 *   - run-fix         → submit current input as a normal Fix
 *   - run-architect   → submit current input as Architect (Prompt → Code)
 *   - load-template   → fill input + set mode (debug, refactor, deploy, …)
 *   - convert-cursor  → set mode=cursor (and optionally fire Fix)
 *   - compare         → toggle compare mode on the prompt tab
 *   - mode            → set the prompt mode
 *
 * The owning component (PromptFixer) provides the action bus.
 */

export type CommandAction =
  | { kind: "run-fix" }
  | { kind: "run-architect" }
  | { kind: "load-template"; body: string; mode: Mode; label: string }
  | { kind: "set-mode"; mode: Mode }
  | { kind: "compare" };

interface CommandDef {
  id: string;
  label: string;
  hint: string;
  shortcut?: string;
  Icon: typeof Wand2;
  group: "actions" | "modes" | "templates";
  action: CommandAction;
}

const COMMANDS: CommandDef[] = [
  {
    id: "fix",
    label: "/fix",
    hint: "Generate execution-ready prompt from input",
    Icon: Wand2,
    group: "actions",
    action: { kind: "run-fix" }
  },
  {
    id: "architect",
    label: "/architect",
    hint: "Prompt → architecture, stack, file tree, roadmap",
    Icon: Hammer,
    group: "actions",
    action: { kind: "run-architect" }
  },
  {
    id: "compare",
    label: "/compare",
    hint: "Side-by-side: Claude · ChatGPT · Cursor · Gemini",
    Icon: Layers,
    group: "actions",
    action: { kind: "compare" }
  },
  {
    id: "convert-cursor",
    label: "/convert-cursor",
    hint: "Switch mode to Cursor (file-paths + diffs)",
    Icon: Eye,
    group: "modes",
    action: { kind: "set-mode", mode: "cursor" }
  },
  {
    id: "terminal",
    label: "/terminal",
    hint: "Switch mode to Terminal (safety-screened shell)",
    Icon: Terminal,
    group: "modes",
    action: { kind: "set-mode", mode: "terminal" }
  },
  {
    id: "as400",
    label: "/as400",
    hint: "Switch mode to AS400 / IBM i (audit-friendly)",
    Icon: CpuIcon,
    group: "modes",
    action: { kind: "set-mode", mode: "as400" }
  },
  {
    id: "debug",
    label: "/debug",
    hint: "Load a debug template (stack trace → root cause)",
    Icon: Bug,
    group: "templates",
    action: {
      kind: "load-template",
      label: "debug",
      mode: "dev",
      body: [
        "Error / stack trace:",
        "```",
        "[paste]",
        "```",
        "",
        "Repro steps:",
        "1.",
        "",
        "Identify the root cause and produce a minimal patched version with a 1-3 sentence explanation."
      ].join("\n")
    }
  },
  {
    id: "refactor",
    label: "/refactor",
    hint: "Load a refactor template",
    Icon: Cog,
    group: "templates",
    action: {
      kind: "load-template",
      label: "refactor",
      mode: "dev",
      body: [
        "Code to refactor:",
        "```",
        "[paste]",
        "```",
        "",
        "Goal: simplify without changing observable behaviour. Preserve public API and existing tests.",
        "Return the refactored code plus a short bullet list of the changes made."
      ].join("\n")
    }
  },
  {
    id: "deploy",
    label: "/deploy",
    hint: "Load a deploy checklist template",
    Icon: GitBranch,
    group: "templates",
    action: {
      kind: "load-template",
      label: "deploy",
      mode: "terminal",
      body: [
        "Service: [name]",
        "Change: [one-line description]",
        "Environment: [staging / production]",
        "",
        "Produce a deployment checklist:",
        "1. Pre-deploy verifications (commands + expected output)",
        "2. Deploy steps (with rollback for each)",
        "3. Post-deploy validation",
        "4. Rollback procedure if validation fails"
      ].join("\n")
    }
  }
];

interface Props {
  open: boolean;
  onClose: () => void;
  onAction: (action: CommandAction) => void;
  /** Optional preset query when the palette opens (e.g. from the strip's /export chip). */
  initialQuery?: string;
}

export function CommandBar({ open, onClose, onAction, initialQuery }: Props) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return COMMANDS;
    return COMMANDS.filter(
      (c) =>
        c.label.toLowerCase().includes(needle) ||
        c.hint.toLowerCase().includes(needle) ||
        c.id.includes(needle)
    );
  }, [q]);

  // Reset state on open + autofocus.
  useEffect(() => {
    if (open) {
      setQ(initialQuery || "");
      setActive(0);
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open, initialQuery]);

  // Keep active index in range as the filter changes.
  useEffect(() => {
    if (active >= filtered.length) setActive(0);
  }, [filtered.length, active]);

  const submit = (cmd: CommandDef) => {
    onAction(cmd.action);
    onClose();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filtered[active];
      if (cmd) submit(cmd);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="cmd-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm"
          />
          <motion.div
            key="cmd-panel"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
            className="fixed left-1/2 top-[16vh] z-[81] w-[min(640px,92vw)] -translate-x-1/2"
            onKeyDown={onKey}
          >
            <div className="glass-strong overflow-hidden rounded-2xl border border-white/10 shadow-glass">
              <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2.5">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Type a command or search…"
                  className="no-drag flex-1 bg-transparent text-sm text-white/90 placeholder:text-white/30 focus:outline-none"
                />
                <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/45">
                  esc
                </span>
                <button
                  onClick={onClose}
                  className="rounded p-1 text-white/45 hover:bg-white/5 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <ul className="max-h-[60vh] overflow-y-auto py-1 scrollbar-thin">
                {GROUPS.map((g) => {
                  const items = filtered.filter((c) => c.group === g.id);
                  if (items.length === 0) return null;
                  return (
                    <li key={g.id}>
                      <div className="px-3 pb-1 pt-2 text-[9px] font-medium uppercase tracking-[0.18em] text-white/35">
                        {g.label}
                      </div>
                      <ul>
                        {items.map((c) => {
                          const idx = filtered.indexOf(c);
                          const isActive = idx === active;
                          return (
                            <li key={c.id}>
                              <button
                                type="button"
                                onMouseEnter={() => setActive(idx)}
                                onClick={() => submit(c)}
                                className={clsx(
                                  "no-drag flex w-full items-center gap-3 px-3 py-2 text-left transition",
                                  isActive
                                    ? "bg-accent/10 text-white"
                                    : "text-white/75 hover:bg-white/5"
                                )}
                              >
                                <c.Icon
                                  className={clsx(
                                    "h-3.5 w-3.5 shrink-0",
                                    isActive ? "text-accent" : "text-white/45"
                                  )}
                                />
                                <span className="font-mono text-[12px]">{c.label}</span>
                                <span className="truncate text-[11px] text-white/50">
                                  {c.hint}
                                </span>
                                {isActive && (
                                  <span className="ml-auto rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/55">
                                    ↵
                                  </span>
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  );
                })}
                {filtered.length === 0 && (
                  <li className="px-3 py-4 text-center text-[12px] text-white/40">
                    No matching commands.
                  </li>
                )}
              </ul>

              <div className="flex items-center justify-between gap-2 border-t border-white/5 bg-white/[0.02] px-3 py-1.5 text-[10px] text-white/40">
                <span>↑↓ navigate · ↵ run · esc close</span>
                <span className="font-mono uppercase tracking-wider">
                  PromptFixer · AI Command Center
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

const GROUPS: Array<{ id: CommandDef["group"]; label: string }> = [
  { id: "actions", label: "Actions" },
  { id: "modes", label: "Modes" },
  { id: "templates", label: "Templates" }
];

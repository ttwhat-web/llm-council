"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { ChevronDown, ChevronRight, Copy, FolderHeart, Plus, Trash2, Upload } from "lucide-react";
import {
  deleteStack,
  loadStacks,
  saveStack,
  type PromptStack,
  type StackDraft
} from "@/lib/stacks";
import type { Mode } from "@/lib/types";

/**
 * Compact "Saved Stacks" panel.
 *
 * The user's curated library of optimised prompts. Two responsibilities:
 *
 *   - Save the *current* result as a stack (button enabled iff the
 *     parent passes a non-empty draft).
 *   - List existing stacks with Load / Copy / Delete actions.
 *
 * Pure localStorage; no network. Designed to fit between the Skills
 * Explorer and the bottom of the input column without dominating the
 * layout.
 */

interface Props {
  /** Current draft to save. Pass null to disable the Save button. */
  draft: StackDraft | null;
  onLoad: (stack: PromptStack) => void;
  onCopy: (text: string) => void;
  reloadKey?: number;
  compact?: boolean;
}

export function SavedStacks({ draft, onLoad, onCopy, reloadKey, compact }: Props) {
  const [open, setOpen] = useState(false);
  const [stacks, setStacks] = useState<PromptStack[]>([]);
  const [savePulse, setSavePulse] = useState(false);

  useEffect(() => {
    setStacks(loadStacks());
  }, [reloadKey]);

  const onSave = () => {
    if (!draft) return;
    const next = saveStack(draft);
    setStacks(next);
    setOpen(true);
    setSavePulse(true);
    window.setTimeout(() => setSavePulse(false), 600);
  };

  const onDelete = (id: string) => {
    setStacks(deleteStack(id));
  };

  return (
    <section
      className={clsx(
        "rounded-2xl border border-white/6 bg-white/[0.012]",
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
            Saved Stacks
          </span>
          <span className="font-mono text-[9px] uppercase tracking-wider text-white/35">
            {stacks.length}
          </span>
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!draft}
          className={clsx(
            "no-drag inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider transition",
            draft
              ? "border-accent/30 bg-accent/[0.08] text-accent hover:bg-accent/[0.16]"
              : "cursor-not-allowed border-white/10 bg-white/[0.02] text-white/35",
            savePulse && "ring-1 ring-emerald-400/60"
          )}
          title={draft ? "Save current Mission Output" : "Run a fix first"}
        >
          <Plus className="h-3 w-3" />
          Save
        </button>
      </header>

      {open && (
        <div className="border-t border-white/5 px-3 py-2.5">
          {stacks.length === 0 ? (
            <p className="text-[11px] text-white/45">
              <FolderHeart className="mb-0.5 mr-1 inline-block h-3 w-3 text-white/35" />
              No saved stacks yet. Run a fix and tap{" "}
              <span className="text-accent">Save</span> to start your library.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-white/5">
              {stacks.map((s) => (
                <li
                  key={s.id}
                  className="flex items-start gap-2 py-1.5 first:pt-0 last:pb-0"
                >
                  <div className="flex flex-1 flex-col leading-tight">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[12px] font-medium text-white/85">
                        {s.title}
                      </span>
                      <ModePill mode={s.mode} />
                    </div>
                    <span className="mt-0.5 truncate text-[10.5px] text-white/55">
                      {s.input.slice(0, 90)}
                    </span>
                    {s.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {s.tags.slice(0, 4).map((t) => (
                          <span
                            key={t}
                            className="rounded border border-white/10 bg-white/[0.04] px-1 py-px font-mono text-[9px] text-white/55"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <IconButton title="Load" onClick={() => onLoad(s)}>
                      <Upload className="h-3 w-3" />
                    </IconButton>
                    <IconButton title="Copy" onClick={() => onCopy(s.optimized)}>
                      <Copy className="h-3 w-3" />
                    </IconButton>
                    <IconButton
                      title="Delete"
                      onClick={() => onDelete(s.id)}
                      tone="danger"
                    >
                      <Trash2 className="h-3 w-3" />
                    </IconButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function ModePill({ mode }: { mode: Mode }) {
  return (
    <span className="rounded border border-white/10 bg-white/[0.04] px-1 py-px font-mono text-[8.5px] uppercase tracking-wider text-white/55">
      {mode}
    </span>
  );
}

function IconButton({
  title,
  onClick,
  tone,
  children
}: {
  title: string;
  onClick: () => void;
  tone?: "danger";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={clsx(
        "no-drag flex h-5 w-5 items-center justify-center rounded-md border border-white/8 bg-white/[0.02] transition",
        tone === "danger"
          ? "text-rose-300/70 hover:border-rose-400/40 hover:bg-rose-500/[0.08] hover:text-rose-200"
          : "text-white/55 hover:border-accent/30 hover:bg-accent/[0.08] hover:text-accent"
      )}
    >
      {children}
    </button>
  );
}

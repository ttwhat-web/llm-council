"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Check, Github, X } from "lucide-react";
import { useBrainStore } from "@/store/brain";

/**
 * Repo Context card · Phase 13.
 *
 * Lets the operator attach a GitHub repo URL (+ optional branch + note)
 * to the next mission. Stored locally:
 *   · As a memory source (kind: github) so the Brain Graph wakes the
 *     GitHub node and the Brain page lists it.
 *   · In a small session-scoped "active repo" pointer (parent owns) so
 *     the mission dispatcher can read the value at dispatch time.
 *
 * Honest labelling: every attached repo is marked
 * "manual repo context · not indexed yet" — we do not fetch GitHub
 * until an indexer ships.
 */

export interface RepoContextValue {
  url: string;
  branch?: string;
  note?: string;
}

interface Props {
  value: RepoContextValue | null;
  onChange: (v: RepoContextValue | null) => void;
  compact?: boolean;
}

export function RepoContextCard({ value, onChange, compact }: Props) {
  const addMemorySource = useBrainStore((s) => s.addMemorySource);
  const sources = useBrainStore((s) => s.memorySources);
  const [url, setUrl] = useState(value?.url ?? "");
  const [branch, setBranch] = useState(value?.branch ?? "");
  const [note, setNote] = useState(value?.note ?? "");
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setUrl(value?.url ?? "");
    setBranch(value?.branch ?? "");
    setNote(value?.note ?? "");
  }, [value]);

  const onAttach = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    onChange({
      url: trimmed,
      branch: branch.trim() || undefined,
      note: note.trim() || undefined
    });
    // de-dupe by URL: only add a GitHub source if one with the same
    // label doesn't already exist.
    const exists = sources.some(
      (s) => s.kind === "github" && s.label === labelFor(trimmed, branch)
    );
    if (!exists) {
      addMemorySource({
        kind: "github",
        label: labelFor(trimmed, branch),
        state: "configured"
      });
    }
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1100);
  };

  const onClear = () => {
    onChange(null);
    setUrl("");
    setBranch("");
    setNote("");
  };

  const hasAttached = !!value;

  return (
    <section
      className={clsx(
        "flex flex-col gap-2 rounded-2xl border p-4",
        hasAttached
          ? "border-accent/30 bg-accent/[0.04] shadow-glow"
          : "border-white/8 bg-white/[0.02]"
      )}
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Github className="h-3.5 w-3.5 text-accent" />
          <span className="text-[12.5px] font-semibold text-white">Repo Context</span>
        </div>
        <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/55">
          manual · not indexed yet
        </span>
      </header>

      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://github.com/owner/repo"
        className="no-drag rounded-md border border-white/8 bg-white/[0.025] px-2 py-1.5 text-[12px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
      />
      {!compact && (
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="branch (optional)"
            className="no-drag rounded-md border border-white/8 bg-white/[0.025] px-2 py-1.5 text-[12px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
          />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="note (optional)"
            className="no-drag rounded-md border border-white/8 bg-white/[0.025] px-2 py-1.5 text-[12px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onAttach}
          disabled={!url.trim()}
          className={clsx(
            "no-drag inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11.5px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
            savedFlash
              ? "bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-400/40"
              : "bg-accent/85 text-white shadow-glow hover:bg-accent"
          )}
        >
          {savedFlash ? <Check className="h-3 w-3" /> : <Github className="h-3 w-3" />}
          {savedFlash ? "Attached" : hasAttached ? "Update attachment" : "Attach to next mission"}
        </button>
        {hasAttached && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10.5px] font-medium text-white/65 hover:bg-white/[0.06]"
          >
            <X className="h-3 w-3" /> Detach
          </button>
        )}
      </div>

      <p className="text-[10px] text-white/40">
        URL is forwarded as context into the mission brief. Cloning,
        indexing, and PR write-back land with the desktop runtime.
      </p>
    </section>
  );
}

function labelFor(url: string, branch: string) {
  const slug = url.replace(/^https?:\/\//, "").replace(/\.git$/, "");
  return branch.trim() ? `${slug} · ${branch.trim()}` : slug;
}

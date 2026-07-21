"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Brain, Loader2, Search, X } from "lucide-react";
import {
  loadNotes,
  searchNotes,
  type MemoryNote
} from "@/lib/memory-notes";

/**
 * Memory attach affordance, mounted in Mission Control's input column.
 *
 * Opens a popover listing saved notes (search-as-you-type). Selecting
 * a note adds it to the controlled `attached` set; the parent receives
 * the updated list and surfaces removable chips above the textarea.
 */

interface Props {
  attached: MemoryNote[];
  onChange: (next: MemoryNote[]) => void;
  compact?: boolean;
}

export function MemoryAttachButton({ attached, onChange, compact }: Props) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<MemoryNote[] | null>(null);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setNotes(loadNotes());
    const onClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const visible = notes ? searchNotes(query, notes) : [];
  const attachedIds = new Set(attached.map((n) => n.id));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "no-drag inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition",
          attached.length > 0
            ? "border-accent/35 bg-accent/[0.08] text-accent hover:bg-accent/[0.14]"
            : "border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]",
          compact && "text-[10.5px]"
        )}
      >
        <Brain className="h-3.5 w-3.5" />
        Memory
        {attached.length > 0 && (
          <span className="rounded bg-white/[0.08] px-1 font-mono text-[9px] text-white">
            {attached.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-1.5 w-[320px] overflow-hidden rounded-2xl border border-white/10 bg-bg/95 shadow-glass backdrop-blur">
          <header className="flex items-center gap-2 border-b border-white/8 px-3 py-2">
            <Search className="h-3.5 w-3.5 text-white/45" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search memory notes"
              autoFocus
              className="flex-1 bg-transparent text-[12px] text-white placeholder:text-white/30 focus:outline-none"
            />
          </header>
          {notes === null ? (
            <div className="px-3 py-3 text-[11px] text-white/55">
              <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> Loading…
            </div>
          ) : visible.length === 0 ? (
            <div className="px-3 py-3 text-[11px] text-white/55">
              {notes.length === 0
                ? "No memory notes captured yet. Add some from /memory."
                : `No notes match "${query}".`}
            </div>
          ) : (
            <ul className="max-h-[260px] overflow-auto py-1">
              {visible.map((n) => {
                const isAttached = attachedIds.has(n.id);
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (isAttached) {
                          onChange(attached.filter((a) => a.id !== n.id));
                        } else {
                          onChange([...attached, n]);
                        }
                      }}
                      className={clsx(
                        "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition",
                        isAttached
                          ? "bg-accent/[0.06] text-accent"
                          : "text-white/85 hover:bg-white/[0.04]"
                      )}
                    >
                      <span className="truncate text-[12px] font-medium">{n.title}</span>
                      <span className="line-clamp-2 text-[10.5px] text-white/50">
                        {n.body || "(empty)"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <footer className="flex items-center justify-between border-t border-white/8 px-3 py-1.5 text-[10px] text-white/45">
            <span>{attached.length} attached</span>
            <a
              href="/memory"
              target="_blank"
              rel="noreferrer"
              className="font-mono uppercase tracking-wider text-white/55 transition hover:text-white"
            >
              manage →
            </a>
          </footer>
        </div>
      )}
    </div>
  );
}

/** Compact chip rendered above the textarea for each attached note. */
export function MemoryAttachChips({
  attached,
  onRemove
}: {
  attached: MemoryNote[];
  onRemove: (id: string) => void;
}) {
  if (attached.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">
        attached memory
      </span>
      {attached.map((n) => (
        <span
          key={n.id}
          className="inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent/[0.06] px-1.5 py-0.5 text-[10.5px] text-accent"
        >
          <Brain className="h-3 w-3" />
          <span className="max-w-[160px] truncate">{n.title}</span>
          <button
            type="button"
            onClick={() => onRemove(n.id)}
            className="rounded p-0.5 text-accent/70 hover:bg-accent/[0.14] hover:text-accent"
            aria-label="Detach"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
    </div>
  );
}

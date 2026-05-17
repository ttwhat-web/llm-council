"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  Loader2,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
  X
} from "lucide-react";
import {
  deleteNote,
  loadNotes,
  newNoteId,
  saveNote,
  searchNotes,
  type MemoryNote
} from "@/lib/memory-notes";

/**
 * Manual memory notes — create / search / edit / delete.
 *
 * Notes live entirely in localStorage. The companion "attach to
 * mission" surface lives in `components/MemoryAttachButton.tsx`
 * inside Mission Control's input column.
 */

interface DraftState {
  id?: string;
  title: string;
  body: string;
  tagsRaw: string;
}

const EMPTY_DRAFT: DraftState = { title: "", body: "", tagsRaw: "" };

export function MemoryNotesClient() {
  const [notes, setNotes] = useState<MemoryNote[] | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<DraftState | null>(null);

  useEffect(() => {
    setNotes(loadNotes());
    const onStorage = (e: StorageEvent) => {
      if (e.key === "pf.memory.notes.v1" || e.key === null) {
        setNotes(loadNotes());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const visible = useMemo(() => {
    if (!notes) return [];
    return searchNotes(query, notes);
  }, [notes, query]);

  if (notes === null) {
    return (
      <p className="text-[11px] text-white/55">
        <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> Loading notes…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-wrap items-center gap-2">
        <div className="relative flex flex-1 items-center">
          <Search className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-white/35" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes…"
            className="no-drag w-full rounded-md border border-white/8 bg-white/[0.025] py-1.5 pl-7 pr-2 text-[12px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setDraft({ ...EMPTY_DRAFT, id: newNoteId() })}
          className="no-drag inline-flex items-center gap-1.5 rounded-md border border-accent/30 bg-accent/[0.08] px-2.5 py-1 text-[12px] font-medium text-accent transition hover:bg-accent/[0.16]"
        >
          <Plus className="h-3.5 w-3.5" />
          New note
        </button>
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/35">
          {notes.length} / 500
        </span>
      </header>

      {draft && (
        <NoteEditor
          draft={draft}
          onCancel={() => setDraft(null)}
          onSave={(d) => {
            const next = saveNote({
              id: d.id || newNoteId(),
              title: d.title,
              body: d.body,
              tags: parseTags(d.tagsRaw)
            });
            setNotes(next);
            setDraft(null);
          }}
        />
      )}

      {visible.length === 0 ? (
        notes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.012] px-5 py-8 text-center">
            <p className="text-[12.5px] text-white/85">No notes yet.</p>
            <p className="mt-1 text-[11.5px] text-white/50">
              Capture decisions, briefs, summaries — anything you want
              available as mission context. Nothing is sent to a server.
            </p>
          </div>
        ) : (
          <p className="text-[11.5px] text-white/55">
            No notes match &ldquo;{query}&rdquo;.
          </p>
        )
      ) : (
        <ul className="flex flex-col divide-y divide-white/5 rounded-2xl border border-white/8 bg-white/[0.02]">
          {visible.map((n) => (
            <li key={n.id} className="flex items-start gap-3 px-4 py-3">
              <div className="flex flex-1 flex-col gap-1 leading-tight">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[12.5px] font-semibold text-white">{n.title}</span>
                  {n.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.04] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-white/55"
                    >
                      <Tag className="h-2.5 w-2.5" />
                      {tag}
                    </span>
                  ))}
                  <span className="ml-auto font-mono text-[9.5px] uppercase tracking-wider text-white/35">
                    {formatRelative(n.updatedAt)}
                  </span>
                </div>
                <p className="line-clamp-3 whitespace-pre-wrap text-[11.5px] text-white/65">
                  {n.body || "(empty)"}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <IconButton
                  title="Edit"
                  onClick={() =>
                    setDraft({
                      id: n.id,
                      title: n.title,
                      body: n.body,
                      tagsRaw: n.tags.join(", ")
                    })
                  }
                >
                  <Pencil className="h-3 w-3" />
                </IconButton>
                <IconButton
                  title="Delete"
                  tone="danger"
                  onClick={() => setNotes(deleteNote(n.id))}
                >
                  <Trash2 className="h-3 w-3" />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------- editor ---------------------------------------------------------

function NoteEditor({
  draft,
  onCancel,
  onSave
}: {
  draft: DraftState;
  onCancel: () => void;
  onSave: (d: DraftState) => void;
}) {
  const [local, setLocal] = useState<DraftState>(draft);
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-accent/30 bg-white/[0.02] p-3 shadow-glow">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
          {draft.id ? "edit note" : "new note"}
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md p-0.5 text-white/55 transition hover:bg-white/[0.06] hover:text-white"
          aria-label="Cancel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <input
        type="text"
        value={local.title}
        onChange={(e) => setLocal({ ...local, title: e.target.value })}
        placeholder="Title"
        className="no-drag w-full rounded-md border border-white/8 bg-white/[0.025] px-2 py-1.5 text-[13px] font-medium text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
        autoFocus
      />
      <textarea
        value={local.body}
        onChange={(e) => setLocal({ ...local, body: e.target.value })}
        placeholder="Body — markdown ok. Use this as memory the operator can attach to missions."
        rows={6}
        className="no-drag w-full resize-y rounded-md border border-white/8 bg-white/[0.025] px-2 py-1.5 text-[12px] text-white/90 placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
      />
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={local.tagsRaw}
          onChange={(e) => setLocal({ ...local, tagsRaw: e.target.value })}
          placeholder="tags, comma-separated"
          className="no-drag flex-1 rounded-md border border-white/8 bg-white/[0.025] px-2 py-1 text-[11px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => onSave(local)}
          disabled={!local.title.trim() && !local.body.trim()}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-accent/90 px-3 py-1 text-[12px] font-semibold text-white shadow-glow transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
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
      title={title}
      onClick={onClick}
      className={clsx(
        "no-drag flex h-6 w-6 items-center justify-center rounded-md border border-white/8 bg-white/[0.02] transition",
        tone === "danger"
          ? "text-rose-300/65 hover:border-rose-400/40 hover:bg-rose-500/[0.08] hover:text-rose-200"
          : "text-white/55 hover:border-accent/30 hover:bg-accent/[0.08] hover:text-accent"
      )}
    >
      {children}
    </button>
  );
}

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

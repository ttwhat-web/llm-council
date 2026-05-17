"use client";

import { useState } from "react";
import { Activity, FileText, Plus, Search } from "lucide-react";
import { SurfaceHeader } from "@/components/primitives/SurfaceHeader";

/**
 * Memory surface · Brain Notes.
 *
 * Manual notes today — typed and indexed on-device. Source connectors
 * (Obsidian / GitHub / Gmail / Drive) surface on the Brain page; this
 * page is the writing inbox for human-authored notes.
 *
 * Persistence lands when the Tauri storage layer wires up. For now the
 * notes live in-memory and the page is honest about that.
 */

interface BrainNote {
  id: string;
  title: string;
  body: string;
  createdAt: number;
}

export default function MemoryPage() {
  const [notes, setNotes] = useState<BrainNote[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [query, setQuery] = useState("");

  const onAdd = () => {
    if (!title.trim() && !body.trim()) return;
    const n: BrainNote = {
      id: Math.random().toString(36).slice(2),
      title: title.trim() || "Untitled note",
      body: body.trim(),
      createdAt: Date.now()
    };
    setNotes((prev) => [n, ...prev]);
    setTitle("");
    setBody("");
  };

  const filtered = query.trim()
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(query.toLowerCase()) ||
          n.body.toLowerCase().includes(query.toLowerCase())
      )
    : notes;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-5 py-5 md:px-7 md:py-7">
      <SurfaceHeader
        eyebrow="memory · brain notes"
        title="Memory"
        sub="Manual brain notes captured by you. Connectors (Obsidian, GitHub, Gmail, Drive) live under Brain — this page is the typing inbox."
        right={
          <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/55">
            {notes.length} note{notes.length === 1 ? "" : "s"} · in-session only
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,360px)_1fr]">
        <section className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <header className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
            new note
          </header>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="rounded-md border border-white/8 bg-white/[0.025] px-2 py-1.5 text-[12.5px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What should the brain remember?"
            rows={6}
            className="resize-y rounded-md border border-white/8 bg-white/[0.025] px-2 py-1.5 text-[12.5px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
          />
          <button
            type="button"
            onClick={onAdd}
            disabled={!title.trim() && !body.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-accent/90 px-3 py-1.5 text-[12px] font-semibold text-white shadow-glow transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" /> Add to Brain
          </button>
          <p className="text-[10px] text-white/40">
            Local-only · persistence lands when the desktop storage layer
            ships. Notes vanish when you close the window today.
          </p>
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <header className="flex items-center justify-between gap-3 border-b border-white/6 pb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-accent" />
              <span className="text-[13px] font-semibold text-white">
                Brain Notes
              </span>
            </div>
            <label className="flex items-center gap-1.5 rounded-md border border-white/8 bg-white/[0.025] px-2 py-1 text-[11.5px] text-white/70">
              <Search className="h-3 w-3 text-white/40" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="w-[160px] bg-transparent placeholder:text-white/30 focus:outline-none"
              />
            </label>
          </header>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.012] p-6 text-center">
              <FileText className="mx-auto h-5 w-5 text-white/35" />
              <p className="mt-2 text-[12px] text-white/70">
                {notes.length === 0 ? "No notes yet." : `No notes match "${query}".`}
              </p>
              <p className="mt-1 text-[11px] text-white/45">
                Drop anything the brain should keep — a fact, a constraint, a
                style note, a long-running goal.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {filtered.map((n) => (
                <li
                  key={n.id}
                  className="rounded-xl border border-white/8 bg-white/[0.015] p-3"
                >
                  <div className="mb-0.5 flex items-center justify-between">
                    <span className="text-[12.5px] font-semibold text-white">
                      {n.title}
                    </span>
                    <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/35">
                      {new Date(n.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  {n.body && (
                    <p className="whitespace-pre-wrap text-[11.5px] text-white/65">
                      {n.body}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

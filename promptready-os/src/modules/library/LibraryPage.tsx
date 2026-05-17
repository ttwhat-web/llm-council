"use client";

import { Archive, Inbox } from "lucide-react";
import { SurfaceHeader } from "@/components/primitives/SurfaceHeader";

/**
 * Library surface · Operations Archive.
 *
 * Every dispatched mission produces a receipt + named deliverables.
 * Once the desktop runtime is wired, this page lists them — searchable,
 * filterable, pinnable. Empty + honest until then.
 */

const COLS: Array<{ key: string; label: string }> = [
  { key: "ts", label: "Timestamp" },
  { key: "mode", label: "Mode" },
  { key: "route", label: "Route" },
  { key: "score", label: "Score" },
  { key: "deliverables", label: "Deliverables" }
];

export default function LibraryPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1300px] flex-col gap-5 px-5 py-5 md:px-7 md:py-7">
      <SurfaceHeader
        eyebrow="library · operations archive"
        title="Library"
        sub="Every dispatched mission lands here as a receipt + deliverables bundle. Searchable · pinnable · exportable. Empty until the engine is wired."
        right={
          <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/55">
            0 receipts · engine offline
          </span>
        }
      />

      <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
        <div className="overflow-hidden rounded-xl border border-white/8 bg-white/[0.012]">
          <header className="grid grid-cols-[140px_120px_140px_80px_1fr] gap-2 border-b border-white/6 bg-white/[0.02] px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/40">
            {COLS.map((c) => (
              <span key={c.key}>{c.label}</span>
            ))}
          </header>

          <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
            <Inbox className="h-6 w-6 text-white/35" />
            <p className="text-[13px] text-white/75">No missions archived yet.</p>
            <p className="max-w-[60ch] text-[11px] text-white/45">
              Dispatch a mission from Mission Control. Receipts and named
              deliverables (Cursor Task · Claude Prompt · Linear Issue · etc.)
              get saved here automatically.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
        <header className="mb-2 flex items-center gap-2">
          <Archive className="h-3.5 w-3.5 text-accent" />
          <span className="text-[13px] font-semibold text-white">
            What gets archived
          </span>
        </header>
        <ul className="grid grid-cols-1 gap-2 text-[11.5px] text-white/65 md:grid-cols-2">
          <li>· The full mission brief and the model routing decision</li>
          <li>· Every named deliverable in its native format</li>
          <li>· Quality score, latency, and engine version</li>
          <li>· Attached Brain Notes and connector context</li>
        </ul>
      </section>
    </div>
  );
}

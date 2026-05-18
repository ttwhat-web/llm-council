"use client";

import { useState, type DragEvent } from "react";
import clsx from "clsx";
import { FileText, Github, Pin, Receipt, Upload, X } from "lucide-react";
import { useAtlasStore, type AtlasFile } from "@/store/atlas";
import { useBrainStore } from "@/store/brain";
import { useMissionStore } from "@/store/mission";

/**
 * Memory Vault · used inside the Atlas Memory Layer detail.
 *
 * Five tabs:
 *   Notes    · brain notes hint (full editor stays on /memory)
 *   Repos    · github sources from the brain
 *   Files    · drag-drop area · metadata-only storage
 *   Receipts · recent mission receipts
 *   Pins     · pinned deliverables (Atlas store)
 */

type Tab = "notes" | "repos" | "files" | "receipts" | "pins";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "notes", label: "Notes" },
  { id: "repos", label: "Repos" },
  { id: "files", label: "Files" },
  { id: "receipts", label: "Receipts" },
  { id: "pins", label: "Pins" }
];

export function MemoryVault({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("files");
  const files = useAtlasStore((s) => s.files);
  const addFiles = useAtlasStore((s) => s.addFiles);
  const removeFile = useAtlasStore((s) => s.removeFile);
  const pinned = useAtlasStore((s) => s.pinnedDeliverables);
  const sources = useBrainStore((s) => s.memorySources);
  const history = useMissionStore((s) => s.history);
  const [dragOver, setDragOver] = useState(false);

  const repos = sources.filter((s) => s.kind === "github");
  const notes = sources.filter((s) => s.kind === "brain-notes");

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer?.files ?? []);
    if (dropped.length === 0) return;
    addFiles(
      dropped.map((f) => ({ name: f.name, size: f.size, type: f.type || "binary" }))
    );
  };

  // Pinned deliverables resolved from all receipts.
  const pinnedDeliverables = history
    .flatMap((m) => m.deliverables.map((d) => ({ ...d, missionId: m.id })))
    .filter((d) => pinned.includes(d.id));

  return (
    <div className="flex flex-col gap-2">
      <header className="flex items-center justify-between">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
          memory vault
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 text-white/55 hover:bg-white/[0.06] hover:text-white"
        >
          <X className="h-3 w-3" />
        </button>
      </header>

      <nav className="flex flex-wrap items-center gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={clsx(
              "rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition",
              tab === t.id
                ? "border-accent/40 bg-accent/[0.08] text-accent"
                : "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.06]"
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "notes" && (
        <div className="rounded-md border border-white/8 bg-white/[0.012] p-3 text-[11px] text-white/65">
          <p>
            {notes.length > 0
              ? "Brain Notes source is connected. The full note editor lives on /memory."
              : "No Brain Notes source yet. Bootstrap a brain with the Brain Notes source to enable."}
          </p>
          <a
            href="/memory"
            className="mt-2 inline-flex font-mono text-[10px] uppercase tracking-wider text-accent hover:underline"
          >
            open /memory →
          </a>
        </div>
      )}

      {tab === "repos" && (
        <div className="flex flex-col gap-1">
          {repos.length === 0 ? (
            <p className="rounded-md border border-dashed border-white/10 bg-white/[0.008] p-3 text-[11px] text-white/55">
              No repos attached. Use the Repo Layer cell to add one.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {repos.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-md border border-white/8 bg-white/[0.012] px-2 py-1 text-[11px]"
                >
                  <div className="flex items-center gap-1.5">
                    <Github className="h-3 w-3 text-accent" />
                    <span className="truncate font-mono text-white">{r.label}</span>
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-white/45">
                    manual · not indexed yet
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "files" && (
        <>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={clsx(
              "rounded-md border border-dashed p-4 text-center transition",
              dragOver
                ? "border-accent/50 bg-accent/[0.06]"
                : "border-white/10 bg-white/[0.008]"
            )}
          >
            <Upload className="mx-auto h-4 w-4 text-accent" />
            <p className="mt-1 text-[11.5px] text-white/75">
              Drop PDFs · markdown · txt · images here
            </p>
            <p className="text-[10px] text-white/45">
              Metadata stays on this machine. Content storage lands with the
              desktop runtime — files queue as <span className="font-mono">queued · not-processed</span>.
            </p>
          </div>

          {files.length > 0 && (
            <ul className="flex max-h-[180px] flex-col gap-1 overflow-auto pr-1">
              {files.map((f) => (
                <FileRow key={f.id} file={f} onRemove={() => removeFile(f.id)} />
              ))}
            </ul>
          )}
        </>
      )}

      {tab === "receipts" && (
        <div className="flex flex-col gap-1">
          {history.length === 0 ? (
            <p className="rounded-md border border-dashed border-white/10 bg-white/[0.008] p-3 text-[11px] text-white/55">
              No receipts archived yet.
            </p>
          ) : (
            <ul className="flex max-h-[200px] flex-col gap-1 overflow-auto pr-1">
              {history.slice(0, 12).map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-md border border-white/8 bg-white/[0.012] px-2 py-1 text-[11px]"
                >
                  <span className="flex items-center gap-1.5">
                    <Receipt className="h-3 w-3 text-accent" />
                    <span className="truncate text-white/80">{m.brief.slice(0, 48)}</span>
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-white/45">
                    {m.stage === "deliverable-ready" ? "ready" : m.stage}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "pins" && (
        <div className="flex flex-col gap-1">
          {pinnedDeliverables.length === 0 ? (
            <p className="rounded-md border border-dashed border-white/10 bg-white/[0.008] p-3 text-[11px] text-white/55">
              Nothing pinned. Pin deliverables from the Delivery Layer cell.
            </p>
          ) : (
            <ul className="flex max-h-[200px] flex-col gap-1 overflow-auto pr-1">
              {pinnedDeliverables.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between rounded-md border border-white/8 bg-white/[0.012] px-2 py-1 text-[11px]"
                >
                  <span className="flex items-center gap-1.5">
                    <Pin className="h-3 w-3 text-accent" />
                    <span className="truncate text-white/80">{d.label}</span>
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-white/45">
                    {d.format}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function FileRow({ file, onRemove }: { file: AtlasFile; onRemove: () => void }) {
  return (
    <li className="flex items-center justify-between rounded-md border border-white/8 bg-white/[0.012] px-2 py-1 text-[11px]">
      <div className="flex min-w-0 items-center gap-1.5">
        <FileText className="h-3 w-3 shrink-0 text-accent" />
        <span className="truncate text-white">{file.name}</span>
        <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-white/40">
          {bytes(file.size)}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="rounded border border-white/10 bg-white/[0.03] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-white/55">
          {file.state}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="rounded p-0.5 text-white/40 hover:bg-white/[0.06] hover:text-white/80"
          aria-label="Remove"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      </div>
    </li>
  );
}

function bytes(b: number) {
  if (b < 1024) return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)}KB`;
  return `${(b / (1024 * 1024)).toFixed(1)}MB`;
}

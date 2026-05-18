"use client";

import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import clsx from "clsx";
import {
  FileText,
  FolderOpen,
  Github,
  Inbox as InboxIcon,
  Pin,
  Receipt,
  Rocket,
  Search,
  Upload,
  X
} from "lucide-react";
import {
  useAtlasStore,
  type AtlasFile,
  type InboxItem,
  type InboxKind,
  type MemoryDoc
} from "@/store/atlas";
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

type Tab = "inbox" | "notes" | "repos" | "files" | "receipts" | "pins";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "inbox", label: "Inbox" },
  { id: "notes", label: "Notes" },
  { id: "repos", label: "Repos" },
  { id: "files", label: "Files" },
  { id: "receipts", label: "Receipts" },
  { id: "pins", label: "Pins" }
];

const IMPORTABLE_EXT = [".md", ".txt", ".json"];

interface ImportedRow {
  doc: MemoryDoc;
  matches: number;
}

export function MemoryVault({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("inbox");
  const files = useAtlasStore((s) => s.files);
  const addFiles = useAtlasStore((s) => s.addFiles);
  const removeFile = useAtlasStore((s) => s.removeFile);
  const pinned = useAtlasStore((s) => s.pinnedDeliverables);
  const inbox = useAtlasStore((s) => s.inbox);
  const addInbox = useAtlasStore((s) => s.addInbox);
  const setInboxState = useAtlasStore((s) => s.setInboxState);
  const removeInbox = useAtlasStore((s) => s.removeInbox);
  const memoryDocs = useAtlasStore((s) => s.memoryDocs);
  const addMemoryDocs = useAtlasStore((s) => s.addMemoryDocs);
  const removeMemoryDoc = useAtlasStore((s) => s.removeMemoryDoc);
  const sources = useBrainStore((s) => s.memorySources);
  const history = useMissionStore((s) => s.history);
  const dispatch = useMissionStore((s) => s.dispatch);
  const [dragOver, setDragOver] = useState(false);
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const repos = sources.filter((s) => s.kind === "github");
  const notes = sources.filter((s) => s.kind === "brain-notes");

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer?.files ?? []);
    if (dropped.length === 0) return;
    void importFiles(dropped);
  };

  const importFiles = async (incoming: File[]) => {
    if (incoming.length === 0) return;
    setImporting(true);
    const importable = incoming.filter((f) =>
      IMPORTABLE_EXT.some((ext) => f.name.toLowerCase().endsWith(ext))
    );
    const fileMeta = incoming.map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type || guessType(f.name)
    }));
    addFiles(fileMeta);
    // Read importable files into memoryDocs so they're searchable.
    const docs: Array<Omit<MemoryDoc, "id" | "addedAt">> = [];
    for (const f of importable) {
      try {
        const text = await f.text();
        const ext = f.name.split(".").pop()?.toLowerCase() ?? "txt";
        docs.push({
          name: f.name,
          path: (f as File & { webkitRelativePath?: string }).webkitRelativePath || undefined,
          ext,
          size: f.size,
          body: text.slice(0, 80_000) // cap per doc
        });
      } catch {
        // ignore unreadable
      }
    }
    if (docs.length > 0) addMemoryDocs(docs);
    setImporting(false);
  };

  const onPickFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    void importFiles(list);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const searched = useMemo<ImportedRow[]>(() => {
    if (memoryDocs.length === 0) return [];
    const q = search.trim().toLowerCase();
    if (!q) return memoryDocs.map((d) => ({ doc: d, matches: 0 }));
    return memoryDocs
      .map((d) => ({
        doc: d,
        matches:
          countOccurrences(d.body.toLowerCase(), q) +
          (d.name.toLowerCase().includes(q) ? 3 : 0)
      }))
      .filter((r) => r.matches > 0)
      .sort((a, b) => b.matches - a.matches)
      .slice(0, 30);
  }, [memoryDocs, search]);

  const onAttachDocToMission = async (doc: MemoryDoc) => {
    const seed = doc.body.replace(/\n+/g, "\n").slice(0, 600);
    await dispatch(
      `Use this imported document as context:\n\n[${doc.name}]\n${seed}\n\nProduce the next operator artifact.`,
      "auto",
      "fast",
      null
    );
    onClose();
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
              Drop files · pick a folder · import .md / .txt / .json
            </p>
            <p className="text-[10px] text-white/45">
              Text files are read locally into searchable memory docs.
              Binaries are tracked as metadata only{" "}
              <span className="font-mono">(queued · not-processed)</span>.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              // @ts-expect-error · non-standard but supported in Chromium for directory pick
              webkitdirectory=""
              directory=""
              onChange={onPickFiles}
              className="hidden"
            />
            <div className="mt-2 flex items-center justify-center gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 rounded-md bg-accent/85 px-2 py-1 text-[11px] font-semibold text-white shadow-glow hover:bg-accent"
                disabled={importing}
              >
                <FolderOpen className="h-3 w-3" /> Import folder
              </button>
              <button
                type="button"
                onClick={() => {
                  const single = document.createElement("input");
                  single.type = "file";
                  single.multiple = true;
                  single.accept = ".md,.txt,.json,.markdown";
                  single.onchange = (ev) => {
                    const list = Array.from((ev.target as HTMLInputElement).files ?? []);
                    void importFiles(list);
                  };
                  single.click();
                }}
                className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[10.5px] uppercase tracking-wider text-white/75 hover:bg-white/[0.06]"
                disabled={importing}
              >
                <Upload className="h-3 w-3" /> Pick files
              </button>
            </div>
          </div>

          {memoryDocs.length > 0 && (
            <>
              <label className="flex items-center gap-1.5 rounded-md border border-white/8 bg-white/[0.025] px-2 py-1 text-[11.5px] text-white/70">
                <Search className="h-3 w-3 text-white/40" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${memoryDocs.length} imported doc${memoryDocs.length === 1 ? "" : "s"} · keyword`}
                  className="w-full bg-transparent placeholder:text-white/30 focus:outline-none"
                />
              </label>
              <ul className="flex max-h-[200px] flex-col gap-1 overflow-auto pr-1">
                {searched.map(({ doc, matches }) => (
                  <li
                    key={doc.id}
                    className="rounded-md border border-white/8 bg-white/[0.012] px-2 py-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <FileText className="h-3 w-3 shrink-0 text-accent" />
                        <span className="truncate font-mono text-[11px] text-white">{doc.name}</span>
                        <span className="shrink-0 rounded border border-white/10 bg-white/[0.03] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-white/45">
                          .{doc.ext}
                        </span>
                        {matches > 0 && (
                          <span className="shrink-0 font-mono text-[9.5px] uppercase tracking-wider text-accent/80">
                            {matches} hit{matches === 1 ? "" : "s"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onAttachDocToMission(doc)}
                          title="Attach to next mission and dispatch"
                          className="inline-flex items-center gap-1 rounded-md bg-accent/85 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white shadow-glow hover:bg-accent"
                        >
                          <Rocket className="h-2.5 w-2.5" /> mission
                        </button>
                        <button
                          type="button"
                          onClick={() => removeMemoryDoc(doc.id)}
                          className="rounded p-0.5 text-white/40 hover:bg-white/[0.06] hover:text-white/80"
                          aria-label="Remove"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {files.length > 0 && (
            <details className="mt-1 text-[10.5px] text-white/55">
              <summary className="cursor-pointer font-mono text-[9.5px] uppercase tracking-wider">
                file metadata ({files.length})
              </summary>
              <ul className="mt-1 flex max-h-[140px] flex-col gap-1 overflow-auto pr-1">
                {files.slice(0, 30).map((f) => (
                  <FileRow key={f.id} file={f} onRemove={() => removeFile(f.id)} />
                ))}
              </ul>
            </details>
          )}
        </>
      )}

      {tab === "inbox" && (
        <BrainInbox
          inbox={inbox}
          onAdd={addInbox}
          onSetState={setInboxState}
          onRemove={removeInbox}
        />
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

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let i = 0;
  while ((i = haystack.indexOf(needle, i)) !== -1) {
    count++;
    i += needle.length;
  }
  return count;
}

function guessType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "md":
    case "markdown":
      return "text/markdown";
    case "txt":
      return "text/plain";
    case "json":
      return "application/json";
    case "pdf":
      return "application/pdf";
    case "png":
    case "jpg":
    case "jpeg":
      return `image/${ext === "jpg" ? "jpeg" : ext}`;
    default:
      return "binary";
  }
}

// ============================================================================
// Brain Inbox
// ============================================================================

const INBOX_KIND_LABEL: Record<InboxKind, string> = {
  text: "Text",
  url: "URL",
  file: "File",
  repo: "Repo",
  voice: "Voice"
};

function BrainInbox({
  inbox,
  onAdd,
  onSetState,
  onRemove
}: {
  inbox: InboxItem[];
  onAdd: (item: { kind: InboxKind; body: string; meta?: string }) => InboxItem;
  onSetState: (id: string, state: InboxItem["state"]) => void;
  onRemove: (id: string) => void;
}) {
  const [kind, setKind] = useState<InboxKind>("text");
  const [body, setBody] = useState("");
  const [meta, setMeta] = useState("");
  const dispatch = useMissionStore((s) => s.dispatch);
  const addMemorySource = useBrainStore((s) => s.addMemorySource);

  const onAddItem = () => {
    const v = body.trim();
    if (!v) return;
    onAdd({ kind, body: v, meta: meta.trim() || undefined });
    setBody("");
    setMeta("");
  };

  const onAttachToMission = async (item: InboxItem) => {
    const seed =
      item.kind === "url"
        ? `Use this URL as context: ${item.body}${item.meta ? `\nNote: ${item.meta}` : ""}\n\nProduce the next operator artifact.`
        : item.kind === "repo"
          ? `Use this repo as context: ${item.body}\n\nProduce the next operator artifact.`
          : `Context:\n${item.body}\n\nProduce the next operator artifact.`;
    await dispatch(seed, "auto", "fast", item.kind === "repo" ? item.body : null);
    onSetState(item.id, "used");
  };

  const onMoveToRepo = (item: InboxItem) => {
    addMemorySource({ kind: "github", label: cleanRepo(item.body), state: "configured" });
    onSetState(item.id, "attached");
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10.5px] text-white/45">
        Universal capture. Paste text, drop a URL, file path, repo link, or
        a voice transcript later. Local only · never sent.
      </p>

      <div className="flex flex-col gap-1.5 rounded-md border border-white/8 bg-white/[0.012] p-2">
        <div className="flex items-center gap-1">
          {(Object.keys(INBOX_KIND_LABEL) as InboxKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              disabled={k === "voice"}
              className={
                kind === k
                  ? "rounded-md border border-accent/40 bg-accent/[0.1] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent"
                  : "rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/65 hover:bg-white/[0.06] disabled:opacity-40"
              }
              title={k === "voice" ? "voice transcript · planned" : undefined}
            >
              {INBOX_KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={
            kind === "url"
              ? "https://example.com/article"
              : kind === "repo"
                ? "owner/repo or full URL"
                : kind === "voice"
                  ? "(voice transcript · planned)"
                  : "Paste anything · idea, snippet, log"
          }
          rows={3}
          disabled={kind === "voice"}
          className="no-drag w-full resize-y rounded-md border border-white/8 bg-white/[0.025] px-2 py-1.5 text-[12px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none disabled:opacity-50"
        />
        <input
          type="text"
          value={meta}
          onChange={(e) => setMeta(e.target.value)}
          placeholder="optional note"
          className="no-drag rounded-md border border-white/8 bg-white/[0.025] px-2 py-1 text-[11px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
        />
        <button
          type="button"
          onClick={onAddItem}
          disabled={!body.trim() || kind === "voice"}
          className="inline-flex items-center justify-center gap-1 rounded-md bg-accent/85 px-2 py-1 text-[11.5px] font-semibold text-white shadow-glow hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <InboxIcon className="h-3 w-3" /> Capture
        </button>
      </div>

      {inbox.length === 0 ? (
        <p className="rounded-md border border-dashed border-white/10 bg-white/[0.008] p-3 text-[11px] text-white/55">
          Inbox empty. Capture anything you want the brain to see later.
        </p>
      ) : (
        <ul className="flex max-h-[220px] flex-col gap-1 overflow-auto pr-1">
          {inbox.map((it) => (
            <li
              key={it.id}
              className="rounded-md border border-white/8 bg-white/[0.012] px-2 py-1.5 text-[11px]"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="rounded border border-white/10 bg-white/[0.03] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-white/55">
                    {INBOX_KIND_LABEL[it.kind]}
                  </span>
                  <span
                    className={
                      it.state === "new"
                        ? "rounded border border-accent/30 bg-accent/[0.08] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-accent"
                        : it.state === "used"
                          ? "rounded border border-emerald-400/30 bg-emerald-500/[0.08] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-emerald-200"
                          : "rounded border border-white/10 bg-white/[0.03] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-white/55"
                    }
                  >
                    {it.state}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(it.id)}
                  className="rounded p-0.5 text-white/40 hover:bg-white/[0.06] hover:text-white/80"
                  aria-label="Remove"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
              <p className="mt-1 line-clamp-2 text-white/85">{it.body}</p>
              {it.meta && <p className="text-[10px] text-white/45">{it.meta}</p>}
              <div className="mt-1 flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => onAttachToMission(it)}
                  className="inline-flex items-center gap-1 rounded-md bg-accent/85 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white shadow-glow hover:bg-accent"
                >
                  <Rocket className="h-2.5 w-2.5" /> attach to mission
                </button>
                {it.kind === "repo" && (
                  <button
                    type="button"
                    onClick={() => onMoveToRepo(it)}
                    className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/75 hover:bg-white/[0.06]"
                  >
                    move to repo context
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    onSetState(it.id, it.state === "archived" ? "new" : "archived")
                  }
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/75 hover:bg-white/[0.06]"
                >
                  {it.state === "archived" ? "unarchive" : "archive"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function cleanRepo(s: string): string {
  return s.replace(/^https?:\/\//, "").replace(/\.git$/, "");
}

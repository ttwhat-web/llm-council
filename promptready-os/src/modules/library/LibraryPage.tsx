"use client";

import { useState } from "react";
import clsx from "clsx";
import { Archive, Copy, Download, Inbox, PlayCircle, Rocket, Search, Trash2 } from "lucide-react";
import { SurfaceHeader } from "@/components/primitives/SurfaceHeader";
import { CodeOperatorActions } from "@/components/CodeOperatorActions";
import { useMissionStore, type MissionReceipt } from "@/store/mission";

/**
 * Operations Archive · Phase 13.
 *
 * Reads receipts from the mission store (which persists to
 * localStorage). Every dispatched mission lands here automatically.
 * Click a row to expand the receipt and download deliverables.
 */

const COLS: Array<{ key: string; label: string; w: string }> = [
  { key: "ts", label: "Timestamp", w: "150px" },
  { key: "mode", label: "Mode", w: "100px" },
  { key: "stage", label: "Stage", w: "140px" },
  { key: "score", label: "Score", w: "80px" },
  { key: "brief", label: "Brief", w: "1fr" }
];

export default function LibraryPage() {
  const history = useMissionStore((s) => s.history);
  const clearHistory = useMissionStore((s) => s.clearHistory);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = query
    ? history.filter(
        (m) =>
          m.brief.toLowerCase().includes(query.toLowerCase()) ||
          m.mode.toLowerCase().includes(query.toLowerCase()) ||
          m.id.toLowerCase().includes(query.toLowerCase())
      )
    : history;

  return (
    <div className="mx-auto flex w-full max-w-[1300px] flex-col gap-5 px-5 py-5 md:px-7 md:py-7">
      <SurfaceHeader
        eyebrow="library · operations archive"
        title="Library"
        sub="Every dispatched mission lands here as a receipt + deliverables bundle. Searchable, exportable, locally persisted."
        right={
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 rounded-md border border-white/8 bg-white/[0.025] px-2 py-1 text-[11.5px] text-white/70">
              <Search className="h-3 w-3 text-white/40" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search receipts…"
                className="w-[200px] bg-transparent placeholder:text-white/30 focus:outline-none"
              />
            </label>
            <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/55">
              {history.length} receipt{history.length === 1 ? "" : "s"}
            </span>
            {history.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                className="inline-flex items-center gap-1 rounded-md border border-rose-400/25 bg-rose-500/[0.06] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-rose-200 hover:bg-rose-500/[0.12]"
              >
                <Trash2 className="h-3 w-3" /> clear archive
              </button>
            )}
          </div>
        }
      />

      <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
        <div className="overflow-hidden rounded-xl border border-white/8 bg-white/[0.012]">
          <header
            className="grid gap-2 border-b border-white/6 bg-white/[0.02] px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/40"
            style={{ gridTemplateColumns: COLS.map((c) => c.w).join(" ") }}
          >
            {COLS.map((c) => (
              <span key={c.key}>{c.label}</span>
            ))}
          </header>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
              <Inbox className="h-6 w-6 text-white/35" />
              <p className="text-[13px] text-white/75">
                {history.length === 0 ? "No missions archived yet." : `No receipts match "${query}".`}
              </p>
              <p className="max-w-[60ch] text-[11px] text-white/45">
                Dispatch a mission from Mission Control. Receipts and named
                deliverables land here automatically.
              </p>
            </div>
          ) : (
            <ul>
              {filtered.map((m) => (
                <ReceiptRow
                  key={m.id}
                  m={m}
                  open={openId === m.id}
                  onToggle={() => setOpenId(openId === m.id ? null : m.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
        <header className="mb-2 flex items-center gap-2">
          <Archive className="h-3.5 w-3.5 text-accent" />
          <span className="text-[13px] font-semibold text-white">What gets archived</span>
        </header>
        <ul className="grid grid-cols-1 gap-2 text-[11.5px] text-white/65 md:grid-cols-2">
          <li>· Mission brief and routing decision</li>
          <li>· Every named deliverable in its native format</li>
          <li>· Quality score, elapsed ms, engine version</li>
          <li>· Attached repo context, if any</li>
        </ul>
      </section>
    </div>
  );
}

function ReceiptRow({
  m,
  open,
  onToggle
}: {
  m: MissionReceipt;
  open: boolean;
  onToggle: () => void;
}) {
  const ts = new Date(m.startedAt).toLocaleString();
  return (
    <li className="border-b border-white/6 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="grid w-full gap-2 px-3 py-2 text-left text-[11.5px] transition hover:bg-white/[0.025]"
        style={{ gridTemplateColumns: COLS.map((c) => c.w).join(" ") }}
      >
        <span className="font-mono text-white/70">{ts}</span>
        <span className="font-mono text-white/80">{m.mode}</span>
        <span
          className={clsx(
            "font-mono uppercase tracking-wider",
            m.stage === "deliverable-ready" ? "text-emerald-300" : "text-white/55"
          )}
        >
          {m.stage}
        </span>
        <span className="font-mono text-white/70">{m.score ? `${m.score}/100` : "—"}</span>
        <span className="truncate text-white/80">{m.brief.slice(0, 90)}</span>
      </button>

      {open && (
        <div className="border-t border-white/6 bg-black/20 px-4 py-3">
          <ReplayHeader m={m} />
          <div className="mb-2 grid grid-cols-2 gap-2 text-[10.5px] md:grid-cols-4">
            <KV k="id" v={m.id} mono />
            <KV k="quality" v={m.quality} mono />
            <KV k="elapsed" v={m.elapsedMs ? `${m.elapsedMs}ms` : "—"} mono />
            <KV k="memory" v={String(m.memoryMatches ?? 0)} mono />
            {m.engine && <KV k="engine" v={m.engine} mono />}
            {m.model && <KV k="model" v={m.model} mono />}
            {m.repoContext && <KV k="repo" v={m.repoContext} mono />}
            <KV k="started" v={new Date(m.startedAt).toLocaleString()} />
          </div>
          <div className="mb-2 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1.5 text-[11px] text-white/75">
            <div className="mb-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/40">brief</div>
            <p className="whitespace-pre-wrap">{m.brief}</p>
          </div>
          {m.deliverables.length > 0 && (
            <div className="mb-2">
              <div className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/40">
                deliverables
              </div>
              <ul className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
                {m.deliverables.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-col gap-1 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1.5 text-[11px]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-semibold text-white">{d.label}</span>
                        <span className="text-[10px] text-white/45">{d.blurb}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => downloadDeliverable(d.label, d.format, d.content)}
                        className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/65 hover:bg-white/[0.06]"
                      >
                        <Download className="h-3 w-3" /> save
                      </button>
                    </div>
                    <CodeOperatorActions
                      label={d.label}
                      content={d.content}
                      repoUrl={m.repoContext}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
          {m.events.length > 0 && (
            <div>
              <div className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/40">
                flight recorder
              </div>
              <ul className="max-h-[180px] overflow-auto rounded-md border border-white/8 bg-black/30 p-2 font-mono text-[10px]">
                {m.events.map((e, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-white/30">{new Date(e.at).toLocaleTimeString()}</span>
                    <span className="uppercase tracking-wider text-white/55">{e.kind}</span>
                    <span className="rounded border border-white/10 bg-white/[0.03] px-1 py-px uppercase tracking-wider text-white/45">
                      {e.tag}
                    </span>
                    <span className="text-white/70">{e.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-white/8 bg-white/[0.012] px-2 py-1">
      <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/40">{k}</span>
      <span className={clsx("truncate text-white/75", mono && "font-mono text-[10.5px]")}>{v}</span>
    </div>
  );
}

function downloadDeliverable(label: string, format: string, content: string) {
  if (typeof window === "undefined") return;
  const ext = format === "shell" ? "sh" : format === "json" ? "json" : format === "markdown" ? "md" : "txt";
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${label.toLowerCase().replace(/\s+/g, "-")}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ----------------------------------------------------------------------------
// Replay Mission · Sprint A
// ----------------------------------------------------------------------------

function ReplayHeader({ m }: { m: MissionReceipt }) {
  const [flash, setFlash] = useState<string | null>(null);
  const dispatch = useMissionStore((s) => s.dispatch);
  const current = useMissionStore((s) => s.current);

  const replayMd = (): string => {
    const lines: string[] = [];
    lines.push(`# Mission Replay · ${m.id}`);
    lines.push("");
    lines.push(`- **Started:** ${new Date(m.startedAt).toISOString()}`);
    if (m.endedAt) lines.push(`- **Ended:** ${new Date(m.endedAt).toISOString()}`);
    lines.push(`- **Mode:** ${m.mode} · **Quality:** ${m.quality}`);
    if (m.engine) lines.push(`- **Engine:** ${m.engine}${m.model ? ` · ${m.model}` : ""}`);
    if (m.score != null) lines.push(`- **Score:** ${m.score}/100`);
    if (m.elapsedMs) lines.push(`- **Elapsed:** ${m.elapsedMs}ms`);
    if (m.memoryMatches != null) lines.push(`- **Memory matches:** ${m.memoryMatches}`);
    if (m.repoContext) lines.push(`- **Repo:** ${m.repoContext}`);
    lines.push("");
    lines.push(`## Brief`);
    lines.push("");
    lines.push(m.brief);
    lines.push("");
    if (m.events.length > 0) {
      lines.push(`## Timeline (${m.events.length} events)`);
      lines.push("");
      for (const e of m.events) {
        lines.push(
          `- \`${new Date(e.at).toISOString()}\` · **${e.kind}** · ${e.tag} · ${e.message}`
        );
      }
      lines.push("");
    }
    lines.push(`## Deliverables (${m.deliverables.length})`);
    lines.push("");
    for (const d of m.deliverables) {
      lines.push(`### ${d.label}`);
      lines.push(`*${d.blurb} · format: ${d.format}*`);
      lines.push("");
      lines.push("```" + (d.format === "shell" ? "sh" : d.format === "json" ? "json" : ""));
      lines.push(d.content);
      lines.push("```");
      lines.push("");
    }
    return lines.join("\n");
  };

  const onCopy = () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    void navigator.clipboard.writeText(replayMd());
    setFlash("replay summary copied");
    window.setTimeout(() => setFlash(null), 2500);
  };

  const onExport = () => {
    if (typeof window === "undefined") return;
    const blob = new Blob([replayMd()], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `replay-${m.id}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setFlash(`exported replay-${m.id}.md`);
    window.setTimeout(() => setFlash(null), 3000);
  };

  const onFollowUp = async () => {
    if (current) {
      setFlash("cancel current mission first");
      window.setTimeout(() => setFlash(null), 3500);
      return;
    }
    const first = m.deliverables[0];
    const quoted = first ? first.content.replace(/\n+/g, "\n").slice(0, 300) : m.brief.slice(0, 300);
    const followUp = `Run a follow-up to mission ${m.id}.\n\nOriginal brief:\n${m.brief}\n\nLast deliverable:\n"""\n${quoted}\n"""\n\nProduce the next operator artifact · justify deviations from the previous step.`;
    await dispatch(followUp, m.mode, m.quality, m.repoContext ?? null);
    setFlash("follow-up dispatched");
    window.setTimeout(() => setFlash(null), 3500);
  };

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-accent/25 bg-accent/[0.04] px-3 py-2">
      <div className="flex items-center gap-1.5">
        <PlayCircle className="h-3.5 w-3.5 text-accent" />
        <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
          replay mission
        </span>
        <span className="font-mono text-[10px] text-white/55">{m.id}</span>
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/75 hover:bg-white/[0.06]"
        >
          <Copy className="h-3 w-3" /> copy replay
        </button>
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/75 hover:bg-white/[0.06]"
        >
          <Download className="h-3 w-3" /> export .md
        </button>
        <button
          type="button"
          onClick={onFollowUp}
          disabled={!!current}
          className="inline-flex items-center gap-1 rounded-md bg-accent/85 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white shadow-glow transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Rocket className="h-3 w-3" /> run follow-up
        </button>
      </div>
      {flash && (
        <p className="basis-full font-mono text-[10px] uppercase tracking-wider text-accent">
          {flash}
        </p>
      )}
    </div>
  );
}

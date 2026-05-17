"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  Activity,
  Archive,
  ArrowRight,
  Clock,
  Copy,
  Cpu,
  FileText,
  Folder,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Trash2
} from "lucide-react";
import {
  deleteReceipt,
  loadReceipts,
  type ReceiptEntry
} from "@/lib/receipts";
import {
  deleteStack,
  loadStacks,
  type PromptStack
} from "@/lib/stacks";
import {
  deleteDraft,
  loadDrafts,
  type LibraryDraft
} from "@/lib/drafts";

/**
 * Library — local Mission Receipt archive + Stacks + Drafts.
 *
 * Three tabs, each backed by its own localStorage store. No backend.
 * Each tab is honest about its empty state.
 */

type TabId = "receipts" | "stacks" | "drafts";

interface State {
  receipts: ReceiptEntry[];
  stacks: PromptStack[];
  drafts: LibraryDraft[];
}

const TABS: Array<{ id: TabId; label: string; Icon: typeof Archive }> = [
  { id: "receipts", label: "Receipts", Icon: Archive },
  { id: "stacks", label: "Stacks", Icon: Folder },
  { id: "drafts", label: "Drafts", Icon: FileText }
];

export function LibraryClient() {
  const [tab, setTab] = useState<TabId>("receipts");
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    reload();
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === "pf.receipts.v1" ||
        e.key === "pf.stacks.v1" ||
        e.key === "pf.drafts.v1" ||
        e.key === null
      ) {
        reload();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function reload() {
    setState({
      receipts: loadReceipts(),
      stacks: loadStacks(),
      drafts: loadDrafts()
    });
  }

  if (state === null) {
    return (
      <p className="text-[11px] text-white/55">
        <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> Loading library…
      </p>
    );
  }

  const counts: Record<TabId, number> = {
    receipts: state.receipts.length,
    stacks: state.stacks.length,
    drafts: state.drafts.length
  };

  return (
    <div className="flex flex-col gap-3">
      <nav className="flex items-center gap-1 rounded-xl border border-white/8 bg-white/[0.02] p-1">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={clsx(
                "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition",
                active
                  ? "bg-accent/15 text-accent shadow-[inset_0_0_0_1px_rgba(124,155,255,0.25)]"
                  : "text-white/65 hover:bg-white/5 hover:text-white/85"
              )}
            >
              <t.Icon className="h-3.5 w-3.5" />
              {t.label}
              <span
                className={clsx(
                  "rounded font-mono text-[9.5px] uppercase tracking-wider",
                  active ? "text-accent/75" : "text-white/40"
                )}
              >
                {counts[t.id]}
              </span>
            </button>
          );
        })}
      </nav>

      {tab === "receipts" && (
        <ReceiptsTab
          receipts={state.receipts}
          onDelete={(id) => setState({ ...state, receipts: deleteReceipt(id) })}
          onClear={() => {
            if (!window.confirm("Clear every local receipt? This cannot be undone.")) {
              return;
            }
            void import("@/lib/receipts").then(({ clearReceipts }) => {
              clearReceipts();
              reload();
            });
          }}
        />
      )}
      {tab === "stacks" && (
        <StacksTab
          stacks={state.stacks}
          onDelete={(id) => setState({ ...state, stacks: deleteStack(id) })}
        />
      )}
      {tab === "drafts" && (
        <DraftsTab
          drafts={state.drafts}
          onDelete={(id) => setState({ ...state, drafts: deleteDraft(id) })}
        />
      )}
    </div>
  );
}

// ============================================================================
// Receipts tab
// ============================================================================

function ReceiptsTab({
  receipts,
  onDelete,
  onClear
}: {
  receipts: ReceiptEntry[];
  onDelete: (id: string) => void;
  onClear: () => void;
}) {
  if (receipts.length === 0) {
    return (
      <EmptyState
        title="No missions archived yet."
        body="Run a mission from Mission Control. Receipts persist to this browser only — nothing is sent to a server."
        cta={{ href: "/app", label: "Open Mission Control" }}
      />
    );
  }
  return (
    <>
      <ToolBar
        left={`${receipts.length} mission${receipts.length === 1 ? "" : "s"} archived · local only`}
        onClear={onClear}
      />
      <ul className="flex flex-col divide-y divide-white/5 rounded-2xl border border-white/8 bg-white/[0.02]">
        {receipts.map((r) => (
          <li key={r.id} className="flex items-start gap-3 px-4 py-3">
            <div className="flex flex-1 flex-col gap-1.5 leading-tight">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded border border-white/10 bg-white/[0.04] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-white/55">
                  {r.id.replace(/^r_/, "").slice(0, 10)}
                </span>
                <span className="rounded border border-white/10 bg-white/[0.04] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-white/55">
                  {r.mode}
                </span>
                <span className="rounded border border-white/10 bg-white/[0.04] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-white/55">
                  {r.quality}
                </span>
                <span
                  className={clsx(
                    "rounded border px-1 py-px font-mono text-[9px] uppercase tracking-wider",
                    r.fallbackUsed
                      ? "border-amber-400/30 bg-amber-500/[0.06] text-amber-200"
                      : "border-white/10 bg-white/[0.04] text-white/55"
                  )}
                  title={r.model || r.provider}
                >
                  {r.provider.replace(/^cloud-/, "")}
                </span>
                <SafetyChip blocked={r.safety.blocked} findings={r.safety.findings} />
              </div>
              <div className="truncate text-[12.5px] text-white/85">
                {r.inputPreview || "(no input recorded)"}
              </div>
              {r.outputPreview && (
                <div className="truncate text-[11px] text-white/50">
                  → {r.outputPreview}
                </div>
              )}
              <div className="mt-0.5 flex flex-wrap items-center gap-3 text-[10px] text-white/40">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(r.createdAt).toLocaleString()}
                </span>
                <span className="inline-flex items-center gap-1 font-mono">
                  <Activity className="h-3 w-3" />
                  {r.elapsedMs}ms
                  {typeof r.latencyMs === "number" && r.latencyMs !== r.elapsedMs && (
                    <span className="text-white/30"> · {r.latencyMs}ms model</span>
                  )}
                </span>
                <span className="inline-flex items-center gap-1 font-mono">
                  <Cpu className="h-3 w-3" />
                  c{r.score.clarity} · s{r.score.specificity} · f{r.score.modelFit}
                </span>
              </div>
            </div>
            <RowDelete onClick={() => onDelete(r.id)} title="Delete this receipt" />
          </li>
        ))}
      </ul>
    </>
  );
}

// ============================================================================
// Stacks tab
// ============================================================================

function StacksTab({
  stacks,
  onDelete
}: {
  stacks: PromptStack[];
  onDelete: (id: string) => void;
}) {
  if (stacks.length === 0) {
    return (
      <EmptyState
        title="No saved stacks yet."
        body="Save the current Mission Output as a Stack from the Saved Stacks panel in Mission Control. Stacks persist to this browser only."
        cta={{ href: "/app", label: "Open Mission Control" }}
      />
    );
  }
  return (
    <ul className="flex flex-col divide-y divide-white/5 rounded-2xl border border-white/8 bg-white/[0.02]">
      {stacks.map((s) => (
        <li key={s.id} className="flex items-start gap-3 px-4 py-3">
          <div className="flex flex-1 flex-col gap-1 leading-tight">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded border border-white/10 bg-white/[0.04] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-white/55">
                {s.mode}
              </span>
              {s.tags.slice(0, 4).map((t) => (
                <span
                  key={t}
                  className="rounded border border-white/10 bg-white/[0.04] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-white/55"
                >
                  {t}
                </span>
              ))}
              <span className="ml-auto font-mono text-[9.5px] uppercase tracking-wider text-white/35">
                {new Date(s.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="truncate text-[12.5px] font-medium text-white">{s.title}</div>
            <div className="truncate text-[11px] text-white/55">{s.input.slice(0, 200)}</div>
          </div>
          <div className="flex flex-col gap-1">
            <CopyButton text={s.optimized} />
            <RowDelete onClick={() => onDelete(s.id)} title="Delete this stack" />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ============================================================================
// Drafts tab
// ============================================================================

function DraftsTab({
  drafts,
  onDelete
}: {
  drafts: LibraryDraft[];
  onDelete: (id: string) => void;
}) {
  if (drafts.length === 0) {
    return (
      <EmptyState
        title="No drafts saved yet."
        body="From the Export menu on a mission output, save any deliverable (Cursor Task, Claude Prompt, Architect plan, ...) to this Library."
        cta={{ href: "/app", label: "Open Mission Control" }}
      />
    );
  }
  return (
    <ul className="flex flex-col divide-y divide-white/5 rounded-2xl border border-white/8 bg-white/[0.02]">
      {drafts.map((d) => (
        <li key={d.id} className="flex items-start gap-3 px-4 py-3">
          <div className="flex flex-1 flex-col gap-1 leading-tight">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded border border-accent/30 bg-accent/[0.06] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-accent">
                {d.format}
              </span>
              <span className="ml-auto font-mono text-[9.5px] uppercase tracking-wider text-white/35">
                {new Date(d.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="truncate text-[12.5px] font-medium text-white">{d.title}</div>
            <pre className="line-clamp-3 whitespace-pre-wrap font-mono text-[10.5px] text-white/55">
              {d.content.slice(0, 600)}
            </pre>
          </div>
          <div className="flex flex-col gap-1">
            <CopyButton text={d.content} />
            <RowDelete onClick={() => onDelete(d.id)} title="Delete this draft" />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ============================================================================
// Atoms
// ============================================================================

function ToolBar({ left, onClear }: { left: string; onClear?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 pb-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
        {left}
      </span>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="font-mono text-[10px] uppercase tracking-wider text-white/35 transition hover:text-rose-200"
        >
          clear all
        </button>
      )}
    </div>
  );
}

function EmptyState({
  title,
  body,
  cta
}: {
  title: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.012] px-5 py-10 text-center">
      <p className="text-[13px] text-white/85">{title}</p>
      <p className="mt-1 text-[12px] text-white/45">{body}</p>
      {cta && (
        <Link
          href={cta.href}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-accent/90 px-3 py-1.5 text-[12px] font-semibold text-white shadow-glow transition hover:bg-accent"
        >
          {cta.label}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function RowDelete({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="rounded-md border border-white/10 bg-white/[0.03] p-1 text-white/45 transition hover:border-rose-400/40 hover:bg-rose-500/[0.08] hover:text-rose-200"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title="Copy"
      onClick={() => {
        if (!navigator?.clipboard) return;
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        });
      }}
      className={clsx(
        "rounded-md border p-1 transition",
        copied
          ? "border-emerald-400/40 bg-emerald-500/[0.08] text-emerald-200"
          : "border-white/10 bg-white/[0.03] text-white/55 hover:border-accent/30 hover:bg-accent/[0.08] hover:text-accent"
      )}
    >
      <Copy className="h-3.5 w-3.5" />
    </button>
  );
}

function SafetyChip({ blocked, findings }: { blocked: boolean; findings: number }) {
  if (blocked) {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-rose-400/40 bg-rose-500/[0.08] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-rose-200">
        <ShieldAlert className="h-3 w-3" />
        blocked
      </span>
    );
  }
  if (findings > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-amber-400/35 bg-amber-500/[0.08] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-amber-200">
        <ShieldAlert className="h-3 w-3" />
        {findings}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded border border-emerald-400/30 bg-emerald-500/[0.06] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-emerald-200">
      <ShieldCheck className="h-3 w-3" />
      clear
    </span>
  );
}

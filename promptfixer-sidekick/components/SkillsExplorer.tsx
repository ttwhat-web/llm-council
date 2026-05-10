"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { ChevronDown, ChevronRight, Loader2, Play, Workflow } from "lucide-react";
import type { SkillCatalogueRow } from "@/lib/skills";
import type { ToolMeta } from "@/lib/tools";
import type { SkillId } from "@/lib/skills/types";

/**
 * Compact Skills Explorer panel.
 *
 * Reads the catalogue from `/api/skills` (cache-friendly), renders one
 * row per skill grouped by status (shipped first), with a per-row Run
 * button that's only enabled for shipped skills. Click → parent handles
 * via the supplied callback (PromptFixer routes through /api/skills/run).
 *
 * Default collapsed; the "shipped" count + unread badge sit in the
 * header so users see the registry without expanding.
 */

interface Props {
  busySkillId: SkillId | null;
  onRunSkill: (skillId: SkillId) => void;
  onRunWorkflow: (workflowId: string) => void;
  workflowBusyId?: string | null;
  compact?: boolean;
}

interface CataloguePayload {
  ok: boolean;
  skills: SkillCatalogueRow[];
  tools: ToolMeta[];
}

export function SkillsExplorer({
  busySkillId,
  onRunSkill,
  onRunWorkflow,
  workflowBusyId,
  compact
}: Props) {
  const [open, setOpen] = useState(false);
  const [catalogue, setCatalogue] = useState<CataloguePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || catalogue) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/skills", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: CataloguePayload) => {
        if (!cancelled) setCatalogue(data);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, catalogue]);

  const shipped = catalogue?.skills.filter((s) => s.status === "shipped") ?? [];
  const planned = catalogue?.skills.filter((s) => s.status !== "shipped") ?? [];
  const tools = catalogue?.tools ?? [];

  return (
    <section
      className={clsx(
        "rounded-2xl border border-white/6 bg-white/[0.012]",
        compact && "text-[11px]"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 transition hover:bg-white/[0.02]"
      >
        <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-white/55">
          {open ? (
            <ChevronDown className="h-3 w-3 text-white/40" />
          ) : (
            <ChevronRight className="h-3 w-3 text-white/40" />
          )}
          Skills
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-white/35">
          {catalogue ? (
            <>
              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-200">
                {shipped.length} ready
              </span>
              <span className="rounded bg-white/[0.04] px-1.5 py-0.5 text-white/45">
                {planned.length} planned
              </span>
            </>
          ) : (
            <span>—</span>
          )}
        </span>
      </button>

      {open && (
        <div className="border-t border-white/5 px-3 py-2.5">
          {loading && (
            <div className="flex items-center gap-2 text-[10px] text-white/45">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading registry…
            </div>
          )}
          {error && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-200">
              {error}
            </div>
          )}

          {catalogue && !loading && (
            <div className="flex flex-col gap-2">
              <SkillSection
                heading="Shipped"
                rows={shipped}
                shipped
                busySkillId={busySkillId}
                onRunSkill={onRunSkill}
              />
              <SkillSection
                heading="Planned"
                rows={planned}
                busySkillId={null}
                onRunSkill={() => {
                  /* shipped-only */
                }}
              />

              <SavedWorkflowSection
                onRunWorkflow={onRunWorkflow}
                busyId={workflowBusyId}
              />

              <ToolsSection tools={tools} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ============================================================================
// Skills section
// ============================================================================

function SkillSection({
  heading,
  rows,
  shipped,
  busySkillId,
  onRunSkill
}: {
  heading: string;
  rows: SkillCatalogueRow[];
  shipped?: boolean;
  busySkillId: SkillId | null;
  onRunSkill: (id: SkillId) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-white/35">
        {heading}
      </span>
      <ul className="flex flex-col divide-y divide-white/5">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex items-start gap-2 py-1.5 first:pt-0 last:pb-0"
          >
            <div className="flex flex-1 flex-col leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-medium text-white/85">{row.name}</span>
                <RiskPill risk={row.risk} />
                <StatusPill status={row.status} />
              </div>
              <span className="mt-0.5 truncate text-[10.5px] text-white/55">
                {row.description}
              </span>
            </div>
            {shipped ? (
              <button
                type="button"
                onClick={() => onRunSkill(row.id)}
                disabled={busySkillId === row.id}
                className="no-drag inline-flex shrink-0 items-center gap-1 rounded-md border border-accent/30 bg-accent/[0.08] px-2 py-0.5 text-[10px] font-medium text-accent transition hover:bg-accent/[0.14] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busySkillId === row.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
                Run
              </button>
            ) : (
              <span className="shrink-0 rounded-md border border-white/8 bg-white/[0.02] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/35">
                soon
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================================
// Saved workflows section
// ============================================================================

const SAVED_WORKFLOWS = [
  {
    id: "fix-clean-architect",
    name: "Fix → Clean → Architect",
    description: "Run the input through every shipped skill in turn."
  }
];

function SavedWorkflowSection({
  onRunWorkflow,
  busyId
}: {
  onRunWorkflow: (id: string) => void;
  busyId?: string | null;
}) {
  return (
    <div className="flex flex-col gap-1 border-t border-white/5 pt-2">
      <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-white/35">
        Saved workflows
      </span>
      <ul className="flex flex-col divide-y divide-white/5">
        {SAVED_WORKFLOWS.map((wf) => (
          <li
            key={wf.id}
            className="flex items-start gap-2 py-1.5 first:pt-0 last:pb-0"
          >
            <div className="flex flex-1 flex-col leading-tight">
              <div className="flex items-center gap-1.5">
                <Workflow className="h-3 w-3 text-accent/70" />
                <span className="text-[12px] font-medium text-white/85">{wf.name}</span>
              </div>
              <span className="mt-0.5 truncate text-[10.5px] text-white/55">
                {wf.description}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onRunWorkflow(wf.id)}
              disabled={busyId === wf.id}
              className="no-drag inline-flex shrink-0 items-center gap-1 rounded-md border border-accent/30 bg-accent/[0.08] px-2 py-0.5 text-[10px] font-medium text-accent transition hover:bg-accent/[0.14] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busyId === wf.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Play className="h-3 w-3" />
              )}
              Run
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================================
// Tools section
// ============================================================================

function ToolsSection({ tools }: { tools: ToolMeta[] }) {
  if (tools.length === 0) return null;
  const shipped = tools.filter((t) => t.status === "shipped");
  const planned = tools.filter((t) => t.status !== "shipped");
  return (
    <div className="flex flex-col gap-1 border-t border-white/5 pt-2">
      <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-white/35">
        Tools
      </span>
      <div className="flex flex-wrap gap-1">
        {shipped.map((t) => (
          <span
            key={t.id}
            className="inline-flex items-center gap-1 rounded-md border border-emerald-500/25 bg-emerald-500/[0.06] px-1.5 py-0.5 font-mono text-[9.5px] text-emerald-200/90"
            title={t.description}
          >
            <span className="h-1 w-1 rounded-full bg-emerald-400" />
            {t.id}
          </span>
        ))}
        {planned.map((t) => (
          <span
            key={t.id}
            className={clsx(
              "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[9.5px]",
              t.risk === "dangerous"
                ? "border-rose-500/25 bg-rose-500/[0.06] text-rose-200/80"
                : t.risk === "approval"
                  ? "border-amber-500/25 bg-amber-500/[0.06] text-amber-200/80"
                  : "border-white/10 bg-white/[0.025] text-white/45"
            )}
            title={`${t.description} · ${t.risk}`}
          >
            <span
              className={clsx(
                "h-1 w-1 rounded-full",
                t.risk === "dangerous"
                  ? "bg-rose-400"
                  : t.risk === "approval"
                    ? "bg-amber-400"
                    : "bg-white/30"
              )}
            />
            {t.id}
          </span>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Pills
// ============================================================================

function RiskPill({ risk }: { risk: "safe" | "approval" | "dangerous" }) {
  const cls = {
    safe: "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-200/80",
    approval: "border-amber-500/30 bg-amber-500/[0.08] text-amber-200/85",
    dangerous: "border-rose-500/30 bg-rose-500/10 text-rose-200/85"
  }[risk];
  return (
    <span
      className={clsx(
        "rounded border px-1 py-px font-mono text-[8.5px] uppercase tracking-wider",
        cls
      )}
    >
      {risk}
    </span>
  );
}

function StatusPill({
  status
}: {
  status: "shipped" | "planned" | "experimental";
}) {
  const cls = {
    shipped: "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-200/80",
    planned: "border-white/15 bg-white/[0.04] text-white/55",
    experimental: "border-amber-500/30 bg-amber-500/[0.08] text-amber-200/85"
  }[status];
  return (
    <span
      className={clsx(
        "rounded border px-1 py-px font-mono text-[8.5px] uppercase tracking-wider",
        cls
      )}
    >
      {status}
    </span>
  );
}

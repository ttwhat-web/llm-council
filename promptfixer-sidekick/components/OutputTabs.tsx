"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Columns, FileText, GitCompare, Hammer, Lightbulb, Sparkles } from "lucide-react";
import { CopyButton } from "./CopyButton";
import { ExportMenu } from "./ExportMenu";
import { OutputActions } from "./OutputActions";
import { ScoreBadges } from "./ScoreBadges";
import { SafetyBadge } from "./SafetyBadge";
import { WhyItWorks } from "./WhyItWorks";
import { ExecutionPreview } from "./ExecutionPreview";
import { CompareView } from "./CompareView";
import { DiffView } from "./DiffView";
import { ArchitectView } from "./ArchitectView";
import type {
  ArchitectResponse,
  ClientContext,
  FixResponse,
  ModelQuality,
  OutputAction
} from "@/lib/types";

type TabId = "prompt" | "why" | "preview" | "architect";

interface Props {
  result: FixResponse;
  modelQuality: ModelQuality;
  clientContext: ClientContext;
  allowCloudFallback: boolean;
  architect?: ArchitectResponse | null;
  forceTab?: TabId;
  busy?: boolean;
  busyAction?: OutputAction | null;
  onAction: (action: OutputAction) => void;
  compact?: boolean;
}

const BASE_TABS: Array<{ id: TabId; label: string; Icon: typeof FileText; pro?: boolean }> = [
  { id: "prompt", label: "Execution-ready prompt", Icon: FileText },
  { id: "why", label: "Why it works", Icon: Lightbulb, pro: true },
  { id: "preview", label: "Execution preview", Icon: Sparkles, pro: true }
];

export function OutputTabs({
  result,
  modelQuality,
  clientContext,
  allowCloudFallback,
  architect,
  forceTab,
  busy,
  busyAction,
  onAction,
  compact
}: Props) {
  const [tab, setTab] = useState<TabId>("prompt");
  const [compare, setCompare] = useState(false);
  const [view, setView] = useState<"final" | "diff">("final");

  const tabs = architect ? [...BASE_TABS, { id: "architect" as TabId, label: "Architect", Icon: Hammer, pro: true }] : BASE_TABS;

  // Auto-jump to Architect when a new plan lands; allow parent to force tab.
  useEffect(() => {
    if (forceTab) setTab(forceTab);
  }, [forceTab]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <ScoreBadges score={result.score} compact={compact} />

      <MetaRow result={result} />

      <div className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-white/6 bg-white/[0.02] p-1">
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={clsx(
                "no-drag inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-medium transition",
                active
                  ? "bg-accent/15 text-accent shadow-[inset_0_0_0_1px_rgba(124,155,255,0.25)]"
                  : "text-white/65 hover:bg-white/5 hover:text-white/85"
              )}
            >
              <t.Icon className="h-3.5 w-3.5" />
              {t.label}
              {t.pro && (
                <span
                  className={clsx(
                    "ml-1 rounded-md border px-1 py-0.5 text-[9px] uppercase tracking-wider",
                    active
                      ? "border-accent/35 bg-accent/15 text-accent"
                      : "border-white/15 bg-white/5 text-white/55"
                  )}
                >
                  Pro
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "prompt" && (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-white/8 bg-white/[0.02] p-0.5">
              <SegButton
                Icon={FileText}
                label="Final"
                active={view === "final" && !compare}
                onClick={() => {
                  setView("final");
                  setCompare(false);
                }}
              />
              <SegButton
                Icon={GitCompare}
                label="Diff"
                active={view === "diff"}
                onClick={() => {
                  setView("diff");
                  setCompare(false);
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setCompare((v) => !v);
                if (!compare) setView("final");
              }}
              className={clsx(
                "no-drag inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition",
                compare
                  ? "border-accent/30 bg-accent/10 text-accent"
                  : "border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.06]"
              )}
            >
              <Columns className="h-3.5 w-3.5" />
              {compare ? "Single view" : "Compare modes"}
            </button>
          </div>

          {compare ? (
            <CompareView sections={result.sections} compact={compact} />
          ) : view === "diff" ? (
            <DiffView before={result.cleaned} after={result.prompt} compact={compact} />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/8 bg-black/30">
              <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
                <div className="flex flex-col">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-white/55">
                    Execution-ready prompt
                  </div>
                  <div className="text-[10px] text-white/40">
                    Copy this into Claude, ChatGPT, Cursor or your AI tool.
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <ExportMenu result={result} />
                  <CopyButton text={result.prompt} />
                </div>
              </div>
              <pre className="scrollbar-thin min-h-0 flex-1 overflow-auto whitespace-pre-wrap px-4 py-3 font-mono text-[12px] leading-relaxed text-white/85">
                {result.prompt}
              </pre>
              <div className="border-t border-white/5 px-3 py-2 text-[11px] text-white/45">
                <span className="text-white/65">Next step:</span> paste this prompt into your
                AI tool to get the final answer.
              </div>
            </div>
          )}

          <OutputActions
            onAction={onAction}
            busyAction={busyAction}
            disabled={busy}
            compact={compact}
          />

          <SafetyBadge safety={result.safety} />

          {result.supervisor.notes && (
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px] text-white/65">
              <span className="text-white/45">Supervisor note: </span>
              {result.supervisor.notes}
            </div>
          )}
          {result.supervisor.error && (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
              Supervisor: {result.supervisor.error}
            </div>
          )}
        </div>
      )}

      {tab === "why" && <WhyItWorks report={result.insights} compact={compact} />}

      {tab === "preview" && (
        <ExecutionPreview
          prompt={result.prompt}
          mode={result.mode}
          modelQuality={modelQuality}
          clientContext={clientContext}
          allowCloudFallback={allowCloudFallback}
          compact={compact}
        />
      )}

      {tab === "architect" && architect && <ArchitectView data={architect} />}
    </div>
  );
}

function MetaRow({ result }: { result: FixResponse }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/60">
      <span className="rounded-md bg-white/5 px-2 py-0.5">
        Mode: <span className="text-white/85">{result.mode}</span>
      </span>
      <span className="rounded-md bg-white/5 px-2 py-0.5">
        Quality: <span className="text-white/85">{result.modelQuality}</span>
      </span>
      {result.action && (
        <span className="rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 text-accent">
          {result.action}
        </span>
      )}
      <span className="rounded-md bg-white/5 px-2 py-0.5">{result.elapsedMs}ms</span>
      <span
        className={clsx(
          "rounded-md px-2 py-0.5",
          result.supervisor.used
            ? "border border-accent/30 bg-accent/10 text-accent"
            : "bg-white/5"
        )}
      >
        {result.supervisor.used ? result.supervisor.resolved : `engine: ${result.supervisor.resolved}`}
      </span>
      {result.supervisor.fallbackUsed && (
        <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-200">
          fallback ({result.supervisor.requestedEngine} → {result.supervisor.resolved})
        </span>
      )}
    </div>
  );
}

function SegButton({
  Icon,
  label,
  active,
  onClick
}: {
  Icon: typeof FileText;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "no-drag inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition",
        active
          ? "bg-accent/15 text-accent shadow-[inset_0_0_0_1px_rgba(124,155,255,0.25)]"
          : "text-white/65 hover:bg-white/5 hover:text-white/85"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

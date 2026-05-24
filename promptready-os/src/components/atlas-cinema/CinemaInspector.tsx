"use client";

import clsx from "clsx";
import { Copy, Crosshair, ExternalLink, Rocket } from "lucide-react";
import { useMissionStore } from "@/store/mission";
import type { CinemaOrbitData, OrbitTone } from "./cinemaAdapter";

interface Props {
  node: CinemaOrbitData | null;
  onClose(): void;
  onOpenPanel(id: string): void;
}

const TONE_CHIP: Record<OrbitTone, string> = {
  live: "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200",
  active: "border-accent/40 bg-accent/[0.1] text-accent",
  pending: "border-amber-400/35 bg-amber-500/[0.08] text-amber-200",
  stale: "border-amber-400/25 bg-amber-500/[0.05] text-amber-200/70",
  offline: "border-white/10 bg-white/[0.03] text-white/55",
  planned: "border-white/8 bg-white/[0.02] text-white/45"
};

const MISSION_TARGETS = new Set([
  "memory",
  "receipts",
  "agents",
  "projects",
  "workflows"
]);

export function CinemaInspector({ node, onClose, onOpenPanel }: Props) {
  if (!node) return null;

  const canMission = MISSION_TARGETS.has(node.id);
  const current = useMissionStore.getState().current;

  const copyId = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(node.id);
    }
  };
  const focusNode = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("cinema:focus", { detail: node.id }));
  };
  const createMission = () => {
    if (!canMission || current) return;
    void useMissionStore
      .getState()
      .dispatch(
        `Brief me on this Atlas node and propose operator actions:\n` +
          `${node.label} (${node.id}) · tone ${node.tone} · ${node.value}`,
        "general",
        "smart",
        null
      );
  };

  return (
    <aside
      className="cinema-inspector absolute right-4 top-24 z-[25] flex w-[260px] flex-col gap-2 rounded-2xl border border-white/12 bg-[rgba(10,12,18,0.7)] p-3 backdrop-blur-md"
      role="dialog"
      aria-label={`${node.label} inspector`}
    >
      <header className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
          inspector
        </span>
        <button
          type="button"
          onClick={onClose}
          className="font-mono text-[10px] uppercase tracking-wider text-white/45 hover:text-white/80"
          aria-label="Close inspector"
        >
          close
        </button>
      </header>

      <div className="flex items-center justify-between gap-2">
        <code
          className="truncate font-mono text-[11px] text-white/85"
          title={node.id}
        >
          {node.id}
        </code>
        <button
          type="button"
          onClick={copyId}
          className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/65 hover:bg-white/[0.06]"
          title="Copy id"
        >
          <Copy className="h-2.5 w-2.5" /> copy
        </button>
      </div>

      <Row k="type">{node.label}</Row>
      <Row k="state">
        <span
          className={clsx(
            "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
            TONE_CHIP[node.tone]
          )}
        >
          {node.tone}
        </span>
      </Row>
      <Row k="source">
        <span className="truncate" title={node.source}>
          {node.source}
        </span>
      </Row>
      <Row k="last">
        {node.lastUpdated
          ? new Date(node.lastUpdated).toLocaleString()
          : "—"}
      </Row>
      <Row k={`related · ${node.relatedLabels.length}`}>
        {node.relatedLabels.length === 0
          ? "—"
          : node.relatedLabels.slice(0, 3).join(" · ")}
      </Row>

      <div className="mt-1 flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={focusNode}
          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-white/65 hover:bg-white/[0.06]"
          title="Focus on this node"
        >
          <Crosshair className="h-3 w-3" /> focus
        </button>
        <button
          type="button"
          onClick={() => onOpenPanel(node.id)}
          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-white/65 hover:bg-white/[0.06]"
          title="Open in Blueprint"
        >
          <ExternalLink className="h-3 w-3" /> open in blueprint
        </button>
        <button
          type="button"
          disabled={!canMission || !!current}
          onClick={createMission}
          className={clsx(
            "inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[9px] uppercase tracking-wider transition",
            !canMission || !!current
              ? "cursor-not-allowed border-white/8 bg-white/[0.02] text-white/35"
              : "border-accent/40 bg-accent/[0.08] text-accent hover:bg-accent/[0.14]"
          )}
          title={
            !canMission
              ? "create mission · planned for this node type"
              : current
                ? "finish current mission first"
                : "Create a mission scoped to this node"
          }
        >
          <Rocket className="h-3 w-3" /> {canMission ? "create mission" : "create mission · planned"}
        </button>
      </div>
    </aside>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1 text-[10.5px]">
      <span className="font-mono text-[9px] uppercase tracking-wider text-white/45">{k}</span>
      <span className="min-w-0 truncate font-mono text-white/80">{children}</span>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  Brain,
  Database,
  Download,
  Eye,
  FileText,
  Github,
  Maximize2,
  Minimize2,
  Phone,
  Rocket,
  Users as TeamIcon,
  Workflow,
  X,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { SurfaceHeader } from "@/components/primitives/SurfaceHeader";
import { useBrainStore } from "@/store/brain";
import { useMissionStore, type MissionReceipt } from "@/store/mission";
import { useAtlasStore, type AtlasHomeMode, type InboxItem, type MemoryDoc } from "@/store/atlas";
import { AtlasHud } from "./AtlasHud";
import { OperationsView, LiveView } from "./AtlasViews";
import { RuntimeHeatmap } from "@/components/RuntimeHeatmap";
import { AtlasHero } from "@/components/AtlasHero";
import { MarketsLauncher } from "@/components/MarketsLauncher";
import { CommandRoomEmptyState } from "@/components/CommandRoomEmptyState";
import { DispatchPanel } from "./panels/DispatchPanel";
import { RepoWorkspace } from "./panels/RepoWorkspace";
import { MemoryVault } from "./panels/MemoryVault";
import { WorkflowCanvas } from "./panels/WorkflowCanvas";
import { DeliveryCenter } from "./panels/DeliveryCenter";
import AtlasCinema from "@/components/atlas-cinema/AtlasCinema";
import type { AtlasCanvasMode } from "@/components/atlas-cinema/CinemaModeSwitch";

const ATLAS_CANVAS_KEY = "promptready-os.atlas.canvas";
const VALID_CANVAS_MODES: AtlasCanvasMode[] = [
  "cinema",
  "graph",
  "blueprint",
  "operations",
  "live"
];
function loadCanvasMode(): AtlasCanvasMode {
  if (typeof window === "undefined") return "cinema";
  try {
    const raw = window.localStorage.getItem(ATLAS_CANVAS_KEY);
    if (raw && (VALID_CANVAS_MODES as string[]).includes(raw)) {
      return raw as AtlasCanvasMode;
    }
  } catch {
    // ignore
  }
  return "cinema";
}

/**
 * Mission Atlas · Phase 14.
 *
 * A blueprint-wall view of the operator's entire AI system. Eight
 * sections orbit the Brain Core; every cell reads real local store
 * state. Clicking a cell opens a side panel with detail · status ·
 * what's real · what's planned · next action.
 *
 * Honest: no fake metrics, no fake live data. Every section either
 * shows real counts or labels itself "planned" / "offline" / "empty".
 *
 * The "Blueprint Export" button serializes the current Atlas to
 * Markdown and downloads it.
 */

type SectionId =
  | "brain-core"
  | "mission-system"
  | "memory-layer"
  | "repo-layer"
  | "workflow-layer"
  | "intelligence-layer"
  | "delivery-layer"
  | "mobile-companion"
  | "team-layer";

interface SectionPosition {
  row: number;
  col: number;
}

interface SectionData {
  id: SectionId;
  title: string;
  eyebrow: string;
  Icon: typeof Brain;
  position: SectionPosition;
  pills: Array<{ label: string; value: string; tone?: "ok" | "warn" | "muted" }>;
  status: { label: string; tone: "ok" | "warn" | "muted" };
  real: string[];
  planned: string[];
  nextAction: string;
  missionLink?: string;
}

// 3×3 grid with Brain Core in the dead center.
const LAYOUT: Record<SectionId, SectionPosition> = {
  "mission-system": { row: 1, col: 1 },
  "memory-layer": { row: 1, col: 2 },
  "repo-layer": { row: 1, col: 3 },
  "workflow-layer": { row: 2, col: 1 },
  "brain-core": { row: 2, col: 2 },
  "intelligence-layer": { row: 2, col: 3 },
  "delivery-layer": { row: 3, col: 1 },
  "mobile-companion": { row: 3, col: 2 },
  "team-layer": { row: 3, col: 3 }
};

const CELL_W = 360;
const CELL_H = 220;
const GAP = 36;
const CANVAS_W = CELL_W * 3 + GAP * 2 + 40;
const CANVAS_H = CELL_H * 3 + GAP * 2 + 40;

export default function AtlasPage() {
  const identity = useBrainStore((s) => s.identity);
  const sources = useBrainStore((s) => s.memorySources);
  const engines = useBrainStore((s) => s.engines);
  const missionCount = useBrainStore((s) => s.missionCount);
  const demo = useBrainStore((s) => s.demo);
  const current = useMissionStore((s) => s.current);
  const history = useMissionStore((s) => s.history);

  const pins = useMemo(readIntelTerminalPins, [history]);
  const alerts = useMemo(readIntelAlerts, [history]);

  const totalDeliverables = useMemo(
    () => history.reduce((n, m) => n + (m.deliverables?.length ?? 0), 0),
    [history]
  );

  const githubSources = sources.filter((s) => s.kind === "github");
  const repoContextHistory = useMemo(
    () =>
      Array.from(
        new Set(
          history
            .map((m) => m.repoContext)
            .filter((r): r is string => !!r)
        )
      ),
    [history]
  );

  const [selected, setSelected] = useState<SectionId | null>(null);
  const [zoom, setZoom] = useState(1);

  const inboxItems = useAtlasStore((s) => s.inbox);
  const memoryDocs = useAtlasStore((s) => s.memoryDocs);

  const sections = useMemo<SectionData[]>(
    () =>
      buildSections({
        identity,
        sources,
        engines,
        missionCount,
        current,
        history,
        pins,
        alerts,
        totalDeliverables,
        githubSources,
        repoContextHistory,
        inboxItems,
        memoryDocs
      }),
    [
      identity,
      sources,
      engines,
      missionCount,
      current,
      history,
      pins,
      alerts,
      totalDeliverables,
      githubSources,
      repoContextHistory,
      inboxItems,
      memoryDocs
    ]
  );

  const onExport = () => {
    const md = buildBlueprintMarkdown({
      identity,
      demo,
      sources,
      engines,
      missionCount,
      historyCount: history.length,
      recent: history.slice(0, 8),
      pins,
      alerts,
      totalDeliverables,
      sections
    });
    download(`mission-atlas-${stamp()}.md`, md);
  };

  const homeMode = useAtlasStore((s) => s.homeMode);
  const setHomeMode = useAtlasStore((s) => s.setHomeMode);

  // Atlas Night Layer · after 20:00 local time, reduce glow & slow
  // ambient. Re-evaluates every 5 minutes. Pure visual.
  const [isNight, setIsNight] = useState<boolean>(() => isNightHour());
  useEffect(() => {
    const t = window.setInterval(() => setIsNight(isNightHour()), 5 * 60_000);
    return () => window.clearInterval(t);
  }, []);

  // Atlas canvas mode · adds "cinema" as the default first-impression
  // surface. Old Atlas remains untouched in graph/blueprint/operations/
  // live modes.
  const [canvasMode, setCanvasMode] = useState<AtlasCanvasMode>(() =>
    loadCanvasMode()
  );
  const persistCanvasMode = (m: AtlasCanvasMode) => {
    setCanvasMode(m);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(ATLAS_CANVAS_KEY, m);
      } catch {
        // ignore
      }
    }
  };

  if (canvasMode === "cinema") {
    return <AtlasCinema mode={canvasMode} onMode={persistCanvasMode} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-4 px-5 py-5 md:px-7 md:py-7">
      <SurfaceHeader
        eyebrow="atlas · operator home"
        title="Mission Atlas"
        sub="Brain, repo hub, mission launcher, workflow wall, delivery center — your operator home screen. Work without leaving Atlas."
        right={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => persistCanvasMode("cinema")}
              className="inline-flex items-center gap-1 rounded-md border border-accent/40 bg-accent/[0.1] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-accent shadow-glow transition hover:bg-accent/[0.15]"
              title="Open Atlas Cinema mode (C)"
            >
              Cinema
            </button>
            <HomeModeToggle mode={homeMode} onChange={setHomeMode} />
            {homeMode === "blueprint" && (
              <ZoomControls zoom={zoom} onZoom={setZoom} />
            )}
            <button
              type="button"
              onClick={onExport}
              className="no-drag inline-flex items-center gap-1.5 rounded-md bg-accent/90 px-2.5 py-1.5 text-[12px] font-semibold text-white shadow-glow transition hover:bg-accent"
              title="Export Atlas blueprint to Markdown"
            >
              <Download className="h-3.5 w-3.5" /> Export
            </button>
          </div>
        }
      />

      <AtlasHud />

      <AtlasHero />
      <MarketsLauncher />
      <CommandRoomEmptyState />

      {homeMode === "operations" && <OperationsView onOpenSection={(id) => setSelected(id as SectionId)} />}
      {homeMode === "live" && <LiveView />}
      {homeMode === "blueprint" && (
        <div
          className={clsx(
            "relative overflow-auto rounded-3xl border border-white/10 bg-graphite-950 shadow-glass",
            isNight && "atlas-night"
          )}
        >
          <div
            className="atlas-grid relative"
            style={{
              width: CANVAS_W,
              height: CANVAS_H,
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
              margin: 0
            }}
          >
            <ConnectingLines sections={sections} selected={selected} />

            {sections.map((s) => (
              <SectionCard
                key={s.id}
                section={s}
                selected={selected === s.id}
                onSelect={() => setSelected(s.id)}
              />
            ))}
          </div>

          <MiniMap selected={selected} sections={sections} />
          {isNight && (
            <span className="pointer-events-none absolute right-3 top-3 rounded border border-white/10 bg-black/40 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-white/45">
              night layer · 20:00 → 08:00
            </span>
          )}
        </div>
      )}

      <RuntimeHeatmap />

      {selected && (
        <DetailPanel
          section={sections.find((s) => s.id === selected)!}
          onClose={() => setSelected(null)}
        />
      )}

      <style>{atlasCss}</style>
    </div>
  );
}

function HomeModeToggle({
  mode,
  onChange
}: {
  mode: AtlasHomeMode;
  onChange: (m: AtlasHomeMode) => void;
}) {
  const opts: Array<{ id: AtlasHomeMode; label: string }> = [
    { id: "blueprint", label: "Blueprint" },
    { id: "operations", label: "Operations" },
    { id: "live", label: "Live" }
  ];
  return (
    <div className="inline-flex items-center gap-0.5 rounded-md border border-white/10 bg-white/[0.03] p-0.5">
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={clsx(
            "rounded px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition",
            mode === o.id
              ? "bg-accent/[0.12] text-accent shadow-[inset_0_0_0_1px_rgba(124,155,255,0.25)]"
              : "text-white/65 hover:bg-white/[0.06]"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Section cards
// ============================================================================

function SectionCard({
  section,
  selected,
  onSelect
}: {
  section: SectionData;
  selected: boolean;
  onSelect: () => void;
}) {
  const isCore = section.id === "brain-core";
  const { x, y } = positionOf(section.position);

  // State-driven styling · purely visual · driven by real status only.
  const isInFlight =
    section.id === "mission-system" && section.status.label === "in flight";
  const isWaitingApproval = section.status.label.includes("waiting") ||
    section.status.label.includes("approval") ||
    section.status.tone === "warn";
  const isBlocked =
    section.status.label.toLowerCase().includes("blocked") ||
    section.status.label.toLowerCase().includes("offline");
  const stateClass = isCore
    ? "atlas-state-core"
    : isBlocked
      ? "atlas-state-bad"
      : isInFlight
        ? "atlas-state-live"
        : isWaitingApproval
          ? "atlas-state-warn"
          : "";

  // Tier · primary cells stay bright · workflow / intelligence / team
  // are visually demoted on first view (UX RESET 04). Grid position
  // is unchanged.
  const secondary =
    section.id === "workflow-layer" ||
    section.id === "intelligence-layer" ||
    section.id === "team-layer";

  return (
    <button
      type="button"
      onClick={onSelect}
      data-state={stateClass.replace("atlas-state-", "")}
      className={clsx(
        "atlas-card group absolute flex flex-col gap-2 rounded-2xl border p-3 text-left transition",
        isCore
          ? "border-accent/40 bg-accent/[0.06] shadow-glow"
          : selected
            ? "border-accent/40 bg-white/[0.04] shadow-glow"
            : "border-white/10 bg-white/[0.018] hover:border-accent/25 hover:bg-white/[0.03]",
        secondary && !selected && "atlas-secondary",
        stateClass
      )}
      style={{ left: x, top: y, width: CELL_W, height: CELL_H }}
    >
      {/* corner brackets */}
      <CornerBrackets active={isCore || selected} />

      <header className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <section.Icon className={isCore ? "h-4 w-4 text-accent" : "h-3.5 w-3.5 text-accent"} />
          <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
            {section.eyebrow}
          </span>
        </div>
        <StatusPill tone={section.status.tone} label={section.status.label} />
      </header>

      <div className="flex items-baseline justify-between gap-2">
        <span
          className={clsx(
            "font-semibold text-white",
            isCore ? "text-[18px]" : "text-[15px]"
          )}
        >
          {section.title}
        </span>
      </div>

      <ul className="grid grid-cols-2 gap-1.5">
        {section.pills.map((p) => (
          <li
            key={p.label}
            className="flex items-center justify-between rounded-md border border-white/8 bg-white/[0.012] px-2 py-1"
          >
            <span className="font-mono text-[9px] uppercase tracking-wider text-white/45">
              {p.label}
            </span>
            <span
              className={clsx(
                "font-mono text-[10.5px]",
                p.tone === "muted"
                  ? "text-white/50"
                  : p.tone === "warn"
                    ? "text-amber-200/85"
                    : "text-white/85"
              )}
            >
              {p.value}
            </span>
          </li>
        ))}
      </ul>

      <footer className="mt-auto flex items-center justify-between font-mono text-[9.5px] uppercase tracking-wider text-white/40">
        <span>click for detail</span>
        <span className="text-white/30">·</span>
        <span className="text-white/55">{section.nextAction}</span>
      </footer>
    </button>
  );
}

function CornerBrackets({ active }: { active: boolean }) {
  const cls = clsx(
    "absolute h-3 w-3 border-accent transition",
    active ? "opacity-100" : "opacity-50 group-hover:opacity-100"
  );
  return (
    <>
      <span className={`${cls} -left-px -top-px border-l border-t`} />
      <span className={`${cls} -right-px -top-px border-r border-t`} />
      <span className={`${cls} -left-px -bottom-px border-l border-b`} />
      <span className={`${cls} -right-px -bottom-px border-r border-b`} />
    </>
  );
}

function StatusPill({ tone, label }: { tone: "ok" | "warn" | "muted"; label: string }) {
  const cls = {
    ok: "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200",
    warn: "border-amber-400/35 bg-amber-500/[0.08] text-amber-200",
    muted: "border-white/10 bg-white/[0.03] text-white/55"
  }[tone];
  return (
    <span
      className={clsx(
        "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
        cls
      )}
    >
      {label}
    </span>
  );
}

// ============================================================================
// Connecting lines (SVG overlay)
// ============================================================================

function ConnectingLines({
  sections,
  selected
}: {
  sections: SectionData[];
  selected: SectionId | null;
}) {
  const core = sections.find((s) => s.id === "brain-core")!;
  const { x: cx, y: cy } = centerOf(core.position);
  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={CANVAS_W}
      height={CANVAS_H}
    >
      {sections
        .filter((s) => s.id !== "brain-core")
        .map((s) => {
          const { x, y } = centerOf(s.position);
          const live = s.status.tone === "ok";
          const sel = selected === s.id;
          const inFlight =
            s.id === "mission-system" && s.status.label === "in flight";
          return (
            <line
              key={s.id}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke={live || sel ? "var(--pr-color-accent)" : "rgba(255,255,255,0.12)"}
              strokeOpacity={sel ? 0.7 : live ? 0.4 : 0.4}
              strokeDasharray={inFlight ? "6 4" : live || sel ? undefined : "4 5"}
              strokeWidth={sel ? 1.25 : 0.75}
            >
              {inFlight && (
                <animate
                  attributeName="stroke-dashoffset"
                  values="0;-20"
                  dur="0.9s"
                  repeatCount="indefinite"
                />
              )}
            </line>
          );
        })}
    </svg>
  );
}

// ============================================================================
// Mini-map
// ============================================================================

function MiniMap({
  sections,
  selected
}: {
  sections: SectionData[];
  selected: SectionId | null;
}) {
  const w = 120;
  const h = 84;
  const sx = w / CANVAS_W;
  const sy = h / CANVAS_H;
  return (
    <div className="pointer-events-none absolute bottom-3 right-3 flex flex-col items-end gap-1">
      <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">mini-map</span>
      <div
        className="relative rounded-md border border-white/10 bg-graphite-900/80 p-1"
        style={{ width: w + 8, height: h + 8 }}
      >
        <svg width={w} height={h}>
          {sections.map((s) => {
            const { x, y } = positionOf(s.position);
            return (
              <rect
                key={s.id}
                x={x * sx + 1}
                y={y * sy + 1}
                width={Math.max(2, CELL_W * sx - 2)}
                height={Math.max(2, CELL_H * sy - 2)}
                rx={1.5}
                fill={
                  s.id === "brain-core"
                    ? "var(--pr-color-accent)"
                    : selected === s.id
                      ? "var(--pr-color-accent-soft)"
                      : s.status.tone === "ok"
                        ? "rgba(255,255,255,0.35)"
                        : "rgba(255,255,255,0.12)"
                }
                opacity={s.id === "brain-core" ? 0.75 : 0.6}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ============================================================================
// Zoom controls
// ============================================================================

function ZoomControls({
  zoom,
  onZoom
}: {
  zoom: number;
  onZoom: (z: number) => void;
}) {
  const step = (delta: number) => {
    const next = Math.min(1.4, Math.max(0.6, +(zoom + delta).toFixed(2)));
    onZoom(next);
  };
  return (
    <div className="inline-flex items-center gap-0.5 rounded-md border border-white/10 bg-white/[0.03] p-0.5 font-mono text-[10px] uppercase tracking-wider text-white/65">
      <button
        type="button"
        title="Zoom out"
        onClick={() => step(-0.1)}
        className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-white/[0.06]"
      >
        <ZoomOut className="h-3 w-3" />
      </button>
      <button
        type="button"
        title="Reset zoom"
        onClick={() => onZoom(1)}
        className="px-1.5"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        type="button"
        title="Zoom in"
        onClick={() => step(0.1)}
        className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-white/[0.06]"
      >
        <ZoomIn className="h-3 w-3" />
      </button>
      <button
        type="button"
        title="Fit"
        onClick={() => onZoom(0.85)}
        className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-white/[0.06]"
      >
        <Maximize2 className="h-3 w-3" />
      </button>
      <button
        type="button"
        title="100%"
        onClick={() => onZoom(1)}
        className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-white/[0.06]"
      >
        <Minimize2 className="h-3 w-3" />
      </button>
    </div>
  );
}

// ============================================================================
// Detail panel
// ============================================================================

function DetailPanel({
  section,
  onClose
}: {
  section: SectionData;
  onClose: () => void;
}) {
  // Sections that ship an inline action panel below the standard
  // header + status. Each panel runs the real action against the
  // existing stores — Atlas never leaves itself.
  const inline = renderInlinePanel(section, onClose);
  // Widen the panel when an inline workflow / delivery / vault is
  // mounted so the operator can actually work.
  const wide = inline.kind === "workflow" || inline.kind === "vault" || inline.kind === "delivery";

  return (
    <aside
      className={clsx(
        "fixed right-5 top-24 z-40 flex max-h-[calc(100vh-7rem)] flex-col gap-3 overflow-auto rounded-2xl border border-accent/25 bg-graphite-900/95 p-4 shadow-glass backdrop-blur md:right-7",
        wide ? "w-[580px]" : "w-[380px]"
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
            {section.eyebrow}
          </span>
          <h3 className="text-[15px] font-semibold text-white">{section.title}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-white/55 hover:bg-white/[0.06] hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      <StatusPill tone={section.status.tone} label={section.status.label} />

      <div className="grid grid-cols-2 gap-1.5">
        {section.pills.map((p) => (
          <div
            key={p.label}
            className="flex items-center justify-between rounded-md border border-white/8 bg-white/[0.012] px-2 py-1"
          >
            <span className="font-mono text-[9px] uppercase tracking-wider text-white/45">
              {p.label}
            </span>
            <span className="font-mono text-[10.5px] text-white/85">{p.value}</span>
          </div>
        ))}
      </div>

      {inline.node ? (
        <div className="rounded-md border border-white/8 bg-white/[0.012] p-2.5">
          {inline.node}
        </div>
      ) : (
        <>
          <DetailBlock title="What's real" items={section.real} tone="ok" />
          <DetailBlock title="What's planned" items={section.planned} tone="muted" />
          <div className="rounded-md border border-accent/25 bg-accent/[0.06] p-2.5">
            <div className="font-mono text-[9px] uppercase tracking-wider text-accent">
              next action
            </div>
            <p className="mt-0.5 text-[11.5px] text-white/85">{section.nextAction}</p>
          </div>
        </>
      )}
    </aside>
  );
}

type InlineKind = "dispatch" | "repo" | "vault" | "workflow" | "delivery" | null;

function renderInlinePanel(
  section: SectionData,
  onClose: () => void
): { kind: InlineKind; node: React.ReactNode | null } {
  switch (section.id) {
    case "mission-system":
      return { kind: "dispatch", node: <DispatchPanel onClose={onClose} /> };
    case "repo-layer":
      return { kind: "repo", node: <RepoWorkspace onClose={onClose} /> };
    case "memory-layer":
      return { kind: "vault", node: <MemoryVault onClose={onClose} /> };
    case "workflow-layer":
      return { kind: "workflow", node: <WorkflowCanvas onClose={onClose} /> };
    case "delivery-layer":
      return { kind: "delivery", node: <DeliveryCenter onClose={onClose} /> };
    default:
      return { kind: null, node: null };
  }
}

function DetailBlock({
  title,
  items,
  tone
}: {
  title: string;
  items: string[];
  tone: "ok" | "muted";
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div
        className={clsx(
          "mb-1 font-mono text-[9.5px] uppercase tracking-[0.22em]",
          tone === "ok" ? "text-emerald-300/85" : "text-white/45"
        )}
      >
        {title}
      </div>
      <ul className="flex flex-col gap-1 text-[11.5px] text-white/70">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-1.5">
            <span
              className={clsx(
                "mt-1.5 h-1 w-1 shrink-0 rounded-full",
                tone === "ok" ? "bg-emerald-400" : "bg-white/35"
              )}
            />
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================================
// Build section data from stores
// ============================================================================

interface BuildArgs {
  identity: ReturnType<typeof useBrainStore.getState>["identity"];
  sources: ReturnType<typeof useBrainStore.getState>["memorySources"];
  engines: ReturnType<typeof useBrainStore.getState>["engines"];
  missionCount: number;
  current: MissionReceipt | null;
  history: MissionReceipt[];
  pins: ReturnType<typeof readIntelTerminalPins>;
  alerts: string[];
  totalDeliverables: number;
  githubSources: ReturnType<typeof useBrainStore.getState>["memorySources"];
  repoContextHistory: string[];
  inboxItems: InboxItem[];
  memoryDocs: MemoryDoc[];
}

function buildSections(a: BuildArgs): SectionData[] {
  const out: SectionData[] = [];

  // 1. Brain Core
  out.push({
    id: "brain-core",
    title: a.identity?.name ?? "No brain yet",
    eyebrow: "core · brain",
    Icon: Brain,
    position: LAYOUT["brain-core"],
    pills: [
      { label: "mode", value: a.identity?.mode ?? "—" },
      { label: "engines", value: String(a.engines.length) },
      { label: "sources", value: String(a.sources.length) },
      { label: "missions", value: String(a.missionCount) }
    ],
    status: a.identity
      ? { tone: "ok", label: "local · ready" }
      : { tone: "muted", label: "no brain" },
    real: a.identity
      ? [
          "Identity stored locally",
          "Deterministic engine always-on",
          ...(a.engines.length > 0
            ? [`${a.engines.length} engine${a.engines.length === 1 ? "" : "s"} selected`]
            : []),
          ...(a.sources.length > 0
            ? [`${a.sources.length} memory source${a.sources.length === 1 ? "" : "s"} attached`]
            : [])
        ]
      : ["Nothing yet — open the bootstrap to begin."],
    planned: ["Tauri keychain persistence", "Cloud-sync brain (opt-in)"],
    nextAction: a.identity
      ? "Dispatch a mission to grow the brain."
      : "Bootstrap a brain from the welcome flow.",
    missionLink: "/"
  });

  // 2. Mission System
  const activeStage = a.current?.stage ?? "idle";
  out.push({
    id: "mission-system",
    title: "Mission Runtime",
    eyebrow: "01 · mission runtime",
    Icon: Rocket,
    position: LAYOUT["mission-system"],
    pills: [
      { label: "active", value: a.current ? "running" : "idle" },
      { label: "stage", value: activeStage },
      { label: "receipts", value: String(a.history.length) },
      { label: "shipped", value: String(a.totalDeliverables) }
    ],
    status: a.current
      ? { tone: "ok", label: "in flight" }
      : a.history.length > 0
        ? { tone: "ok", label: "ready" }
        : { tone: "muted", label: "idle" },
    real: [
      "Deterministic engine dispatches missions locally",
      "Eight typed stages stream into the execution graph",
      `${a.history.length} receipt${a.history.length === 1 ? "" : "s"} archived`,
      `${a.totalDeliverables} deliverable${a.totalDeliverables === 1 ? "" : "s"} produced`
    ],
    planned: ["Ollama routing", "Cloud routing (BYOK)", "Streamed token execution"],
    nextAction: "Open Console · dispatch a brief.",
    missionLink: "/"
  });

  // 3. Memory Layer
  const inboxCount = a.inboxItems.length;
  const memoryDocCount = a.memoryDocs.length;
  out.push({
    id: "memory-layer",
    title: "Memory Runtime",
    eyebrow: "02 · memory runtime",
    Icon: Database,
    position: LAYOUT["memory-layer"],
    pills: [
      { label: "sources", value: String(a.sources.length) },
      { label: "inbox", value: String(inboxCount) },
      { label: "imported", value: String(memoryDocCount) },
      { label: "vaults", value: String(a.sources.filter((s) => s.kind === "obsidian").length) }
    ],
    status:
      a.sources.length + memoryDocCount + inboxCount > 0
        ? { tone: "ok", label: `${a.sources.length} src · ${memoryDocCount} docs · ${inboxCount} inbox` }
        : { tone: "muted", label: "empty" },
    real:
      a.sources.length > 0
        ? a.sources.map(
            (s) => `${s.label} · ${s.state}`
          )
        : ["No memory connected yet."],
    planned: [
      "Brain Notes persistence",
      "Obsidian / Drive / Gmail / Local indexers"
    ],
    nextAction: "Open /memory to capture a brain note.",
    missionLink: "/memory"
  });

  // 4. Repo Layer
  const githubLabels = a.githubSources.map((s) => s.label);
  out.push({
    id: "repo-layer",
    title: "Repo Runtime",
    eyebrow: "03 · repo runtime",
    Icon: Github,
    position: LAYOUT["repo-layer"],
    pills: [
      { label: "repos", value: String(a.githubSources.length) },
      { label: "attached", value: String(a.repoContextHistory.length) },
      { label: "indexed", value: "0", tone: "muted" },
      { label: "branches", value: "—", tone: "muted" }
    ],
    status:
      a.githubSources.length > 0
        ? { tone: "ok", label: "manual" }
        : { tone: "muted", label: "no repos" },
    real:
      a.githubSources.length > 0
        ? githubLabels.slice(0, 5)
        : ["No repos attached yet."],
    planned: [
      "GitHub repo indexer",
      "PR / issue write-back",
      "Branch + diff context"
    ],
    nextAction: "Attach a repo from the Console's Repo Context card.",
    missionLink: "/"
  });

  // 5. Workflow Layer
  out.push({
    id: "workflow-layer",
    title: "Workflow Runtime",
    eyebrow: "04 · workflow runtime",
    Icon: Workflow,
    position: LAYOUT["workflow-layer"],
    pills: [
      { label: "workflows", value: "0", tone: "muted" },
      { label: "agents", value: "0", tone: "muted" },
      { label: "approvals", value: "0", tone: "muted" },
      { label: "triggers", value: "0", tone: "muted" }
    ],
    status: { tone: "muted", label: "planned" },
    real: ["Blueprints listed under /workflows"],
    planned: [
      "Multi-mission chain runtime",
      "Agent runtime (Inbox · Repo · Research)",
      "Schedules + triggers",
      "Phone-side approval gates"
    ],
    nextAction: "Browse planned blueprints under /workflows.",
    missionLink: "/workflows"
  });

  // 6. Intelligence Layer
  const pinTotal = Object.values(a.pins).reduce((acc, arr) => acc + arr.length, 0);
  out.push({
    id: "intelligence-layer",
    title: "Intelligence Runtime",
    eyebrow: "05 · intelligence runtime",
    Icon: Eye,
    position: LAYOUT["intelligence-layer"],
    pills: [
      { label: "pins", value: String(pinTotal) },
      { label: "alerts", value: String(a.alerts.length) },
      { label: "feeds", value: "offline", tone: "warn" },
      { label: "tabs", value: "6" }
    ],
    status:
      pinTotal > 0
        ? { tone: "ok", label: `${pinTotal} watch card${pinTotal === 1 ? "" : "s"}` }
        : { tone: "muted", label: "feeds offline" },
    real:
      pinTotal > 0
        ? [`${pinTotal} card${pinTotal === 1 ? "" : "s"} pinned across 6 tabs`]
        : ["Six tabs · all feeds offline · pin manual cards to scaffold."],
    planned: [
      "Public crypto price feed",
      "Market / FX provider integrations",
      "GitHub repo feed (Brain link)",
      "RSS / arXiv / HN research feed"
    ],
    nextAction: "Open /terminal · pin a card or arm an alert.",
    missionLink: "/terminal"
  });

  // 7. Delivery Layer
  const formats = a.history.flatMap((m) => m.deliverables.map((d) => d.label));
  const uniqueFormats = Array.from(new Set(formats));
  out.push({
    id: "delivery-layer",
    title: "Delivery Runtime",
    eyebrow: "06 · delivery runtime",
    Icon: FileText,
    position: LAYOUT["delivery-layer"],
    pills: [
      { label: "total", value: String(a.totalDeliverables) },
      { label: "formats", value: String(uniqueFormats.length || 8) },
      { label: "exports", value: "copy / download" },
      { label: "receipts", value: String(a.history.length) }
    ],
    status:
      a.totalDeliverables > 0
        ? { tone: "ok", label: "ready" }
        : { tone: "muted", label: "empty" },
    real:
      uniqueFormats.length > 0
        ? uniqueFormats.slice(0, 6)
        : ["Clean Brief · Cursor Task · Claude / ChatGPT prompts · Linear · GitHub · Terminal · Summary"],
    planned: [
      "PDF + share-link receipts",
      "Per-format share to Slack / Linear",
      "Read-only public deliverable URLs (opt-in)"
    ],
    nextAction: "Dispatch a mission · expand each deliverable to copy / download.",
    missionLink: "/library"
  });

  // 8. Mobile Companion
  out.push({
    id: "mobile-companion",
    title: "Remote Runtime",
    eyebrow: "07 · remote runtime · mobile companion",
    Icon: Phone,
    position: LAYOUT["mobile-companion"],
    pills: [
      { label: "paired", value: "0", tone: "muted" },
      { label: "captures", value: "0", tone: "muted" },
      { label: "approvals", value: "0", tone: "muted" },
      { label: "secure", value: "QR + token", tone: "warn" }
    ],
    status: { tone: "muted", label: "planned" },
    real: ["Documented in Settings + landing + docs."],
    planned: [
      "Capture: voice · screenshot · share-sheet",
      "Approve: cloud spend · repo writes · shell commands",
      "View: receipts · deliverables · flight recorder",
      "Dispatch: ask my brain · send to desktop"
    ],
    nextAction: "Open /settings → Mobile Companion card to read the spec.",
    missionLink: "/settings"
  });

  // 9. Team Layer
  const spaces = readSpaces();
  const activeSpace = spaces.find((s) => s.id === spaces[0]?.id);
  out.push({
    id: "team-layer",
    title: "Operator Runtime",
    eyebrow: "08 · operator runtime · team",
    Icon: TeamIcon,
    position: LAYOUT["team-layer"],
    pills: [
      { label: "spaces", value: String(spaces.length) },
      { label: "members", value: String(spaces.reduce((acc, s) => acc + s.members.length, 0)) },
      { label: "active", value: activeSpace?.name ?? "default" },
      { label: "shared workflows", value: "0", tone: "muted" }
    ],
    status:
      spaces.length > 0
        ? { tone: "ok", label: `${spaces.length} space${spaces.length === 1 ? "" : "s"}` }
        : { tone: "muted", label: "single brain" },
    real:
      spaces.length > 0
        ? spaces.map((s) => `${s.name} · ${s.kind} · ${s.members.length} member(s)`)
        : ["No saved spaces yet · the current brain is the default workspace."],
    planned: [
      "Role enforcement (Owner / Operator / Viewer / Approver / Guest)",
      "Shared workflow + memory packs across spaces",
      "Team-side approvals via Telegram bridge",
      "Cloud-sync spaces (opt-in)"
    ],
    nextAction: "Use the space switcher in the HUD to create a new brain.",
    missionLink: "/settings"
  });

  return out;
}

// ============================================================================
// IntelTerminal pin reader (matches the IntelligenceTerminalPage shape)
// ============================================================================

type PinnedCard = { id: string; text: string; tab: string };
type Pinned = Record<string, PinnedCard[]>;

interface SpaceLite {
  id: string;
  name: string;
  kind: string;
  members: { id: string }[];
}

function readSpaces(): SpaceLite[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("promptready-os.spaces");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { spaces?: SpaceLite[] };
    return parsed.spaces ?? [];
  } catch {
    return [];
  }
}

function readIntelTerminalPins(): Pinned {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem("promptready-os.intel-terminal");
    if (!raw) return {};
    return JSON.parse(raw) as Pinned;
  } catch {
    return {};
  }
}

function readIntelAlerts(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("promptready-os.intel-terminal.alerts");
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

// ============================================================================
// Blueprint markdown export
// ============================================================================

interface ExportArgs {
  identity: ReturnType<typeof useBrainStore.getState>["identity"];
  demo: boolean;
  sources: ReturnType<typeof useBrainStore.getState>["memorySources"];
  engines: ReturnType<typeof useBrainStore.getState>["engines"];
  missionCount: number;
  historyCount: number;
  recent: MissionReceipt[];
  pins: Pinned;
  alerts: string[];
  totalDeliverables: number;
  sections: SectionData[];
}

function buildBlueprintMarkdown(a: ExportArgs): string {
  const lines: string[] = [];
  lines.push(`# Mission Atlas — Blueprint Export`);
  lines.push("");
  lines.push(`*Generated ${new Date().toISOString()}*`);
  if (a.demo) lines.push(`*Demo data: yes (labelled)*`);
  lines.push("");

  lines.push(`## Brain identity`);
  if (a.identity) {
    lines.push(`- **Name:** ${a.identity.name}`);
    lines.push(`- **Mode:** ${a.identity.mode}`);
    lines.push(`- **Created:** ${new Date(a.identity.createdAt).toISOString()}`);
  } else {
    lines.push(`- *No brain bootstrapped yet.*`);
  }
  lines.push("");

  lines.push(`## Engines (${a.engines.length})`);
  if (a.engines.length === 0) lines.push(`- *none*`);
  for (const e of a.engines) lines.push(`- ${e.label} · ${e.state}`);
  lines.push("");

  lines.push(`## Memory sources (${a.sources.length})`);
  if (a.sources.length === 0) lines.push(`- *none*`);
  for (const s of a.sources) lines.push(`- ${s.label} · ${s.kind} · ${s.state}`);
  lines.push("");

  const repos = a.sources.filter((s) => s.kind === "github");
  lines.push(`## Repo contexts (${repos.length})`);
  if (repos.length === 0) lines.push(`- *none attached*`);
  for (const r of repos) lines.push(`- ${r.label} — manual · not indexed yet`);
  lines.push("");

  lines.push(`## Missions`);
  lines.push(`- **Total dispatched:** ${a.missionCount}`);
  lines.push(`- **Archived receipts:** ${a.historyCount}`);
  lines.push(`- **Deliverables produced:** ${a.totalDeliverables}`);
  lines.push("");

  if (a.recent.length > 0) {
    lines.push(`### Recent receipts`);
    for (const m of a.recent) {
      const ts = new Date(m.startedAt).toISOString();
      const brief = m.brief.replace(/\n+/g, " · ").slice(0, 90);
      lines.push(
        `- \`${m.id}\` · ${ts} · mode=${m.mode} · stage=${m.stage}${m.score ? ` · score=${m.score}/100` : ""}`
      );
      lines.push(`  > ${brief}`);
    }
    lines.push("");
  }

  const pinTotal = Object.values(a.pins).reduce((acc, arr) => acc + arr.length, 0);
  lines.push(`## Intelligence Terminal pins (${pinTotal})`);
  if (pinTotal === 0) lines.push(`- *none pinned · all feeds offline*`);
  for (const [tab, cards] of Object.entries(a.pins)) {
    if (cards.length === 0) continue;
    lines.push(`- **${tab}:** ${cards.map((c) => c.text).join(" · ")}`);
  }
  lines.push("");

  lines.push(`## Alerts (${a.alerts.length})`);
  if (a.alerts.length === 0) lines.push(`- *no rules armed*`);
  for (const r of a.alerts) lines.push(`- ${r}`);
  lines.push("");

  lines.push(`## Offline / planned`);
  for (const s of a.sections.filter((x) => x.status.tone === "muted")) {
    lines.push(`- **${s.title}** · ${s.status.label}`);
  }
  lines.push("");

  lines.push(`## Next actions`);
  for (const s of a.sections) {
    lines.push(`- **${s.title}** → ${s.nextAction}`);
  }
  lines.push("");

  lines.push(`---`);
  lines.push(`*Atlas is local-first · this file was generated entirely from your machine's state.*`);
  return lines.join("\n");
}

function download(filename: string, content: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function stamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

// ============================================================================
// helpers
// ============================================================================

/** Atlas Night Layer · 20:00 → 08:00 local time. Visual only. */
function isNightHour(): boolean {
  const h = new Date().getHours();
  return h >= 20 || h < 8;
}

function positionOf(p: SectionPosition) {
  return {
    x: 20 + (p.col - 1) * (CELL_W + GAP),
    y: 20 + (p.row - 1) * (CELL_H + GAP)
  };
}

function centerOf(p: SectionPosition) {
  const { x, y } = positionOf(p);
  return { x: x + CELL_W / 2, y: y + CELL_H / 2 };
}

// Atlas ambient · UX RESET 02
//   · 24px blueprint grid (unchanged · already calm)
//   · slow breathing on Brain Core (4s · 96% → 100% opacity)
//   · amber pulse on cells whose status.tone is "warn"
//   · solid live ring on the mission cell while a mission is in flight
//   · red edge on blocked cells
// Every animation is gated by real state · no fake ambient activity.
const atlasCss = `
.atlas-grid {
  background-image:
    linear-gradient(rgba(124,155,255,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(124,155,255,0.05) 1px, transparent 1px);
  background-size: 24px 24px;
  background-position: -1px -1px;
}
.atlas-card {
  backdrop-filter: blur(6px);
}

/* Brain Core · slow breathing · only when a brain exists (parent sets the class) */
.atlas-state-core {
  animation: atlasCoreBreathe 4.5s ease-in-out infinite;
}
@keyframes atlasCoreBreathe {
  0%, 100% { box-shadow: 0 0 24px -8px rgba(124,155,255,0.35), inset 0 0 0 1px rgba(124,155,255,0.30); }
  50%      { box-shadow: 0 0 36px -6px rgba(124,155,255,0.55), inset 0 0 0 1px rgba(124,155,255,0.55); }
}

/* Live mission cell · edge glow loop */
.atlas-state-live {
  animation: atlasEdgeLive 2.4s ease-in-out infinite;
}
@keyframes atlasEdgeLive {
  0%, 100% { box-shadow: inset 0 0 0 1px rgba(124,155,255,0.45), 0 0 0 0 rgba(124,155,255,0.0); }
  50%      { box-shadow: inset 0 0 0 1px rgba(124,155,255,0.75), 0 0 18px -4px rgba(124,155,255,0.45); }
}

/* Approval waiting · amber pulse */
.atlas-state-warn {
  animation: atlasEdgeWarn 1.6s ease-in-out infinite;
  border-color: rgba(251, 191, 36, 0.35) !important;
}
@keyframes atlasEdgeWarn {
  0%, 100% { box-shadow: inset 0 0 0 1px rgba(251,191,36,0.30), 0 0 0 0 rgba(251,191,36,0.0); }
  50%      { box-shadow: inset 0 0 0 1px rgba(251,191,36,0.65), 0 0 16px -4px rgba(251,191,36,0.45); }
}

/* Blocked · red edge · NOT animated (steady red so the operator notices and acts) */
.atlas-state-bad {
  border-color: rgba(248, 113, 113, 0.45) !important;
  box-shadow: inset 0 0 0 1px rgba(248,113,113,0.35), 0 0 14px -6px rgba(248,113,113,0.30);
}

/* Atlas Night Layer · 20:00 → 08:00 local time
   · Slows every running animation by 2.5×
   · Dims accent glows to ~55%
   · Drops blueprint grid opacity slightly
   Purely visual · no behavioural change.                                          */
.atlas-night .atlas-grid {
  background-image:
    linear-gradient(rgba(124,155,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(124,155,255,0.03) 1px, transparent 1px);
}
.atlas-night .atlas-card { filter: brightness(0.85); }
.atlas-night .atlas-state-core { animation-duration: 11s; }
.atlas-night .atlas-state-live { animation-duration: 6s; }
.atlas-night .atlas-state-warn { animation-duration: 4s; }

/* Secondary cells · UX RESET 04 · purely visual demotion of
   workflow / intelligence / team layers on first view. Hover restores
   full opacity so the operator can still scan them at a glance.       */
.atlas-secondary {
  opacity: 0.55;
  filter: saturate(0.85);
}
.atlas-secondary:hover {
  opacity: 1;
  filter: none;
}
`;


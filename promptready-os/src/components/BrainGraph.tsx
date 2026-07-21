"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  BookOpen,
  Brain,
  Cloud,
  Cpu,
  Eye,
  FileText,
  Folder,
  Github,
  HardDrive,
  Mail,
  Rocket
} from "lucide-react";
import { useBrainStore, type MemorySource } from "@/store/brain";
import { useMissionStore } from "@/store/mission";

/**
 * Brain Graph · Phase 13.
 *
 * SVG node map. Brain sits in the center, connectors orbit. State is
 * read live from the brain + mission stores — every count is real (or
 * labelled demo when the demo brain is loaded).
 *
 * Honesty rules:
 *   · Disconnected connectors render muted, never animated.
 *   · An edge is drawn only when the node is configured / active /
 *     manual (i.e. the brain actually "knows" about it).
 *   · The Mission node pulses only when a mission is currently in
 *     flight — never as ambient decoration.
 *
 * Two render sizes:
 *   compact === true  → small embed used in Mission Control's right
 *                        column, no labels.
 *   compact === false → full Brain page graph, with labels + details.
 */

type NodeId =
  | "brain"
  | "notes"
  | "obsidian"
  | "github"
  | "drive"
  | "gmail"
  | "local"
  | "ollama"
  | "cloud"
  | "missions"
  | "watchlist";

interface NodeDef {
  id: NodeId;
  label: string;
  Icon: typeof Brain;
  angle: number; // degrees, 0 = right, 90 = down
}

const ORBIT: NodeDef[] = [
  { id: "notes", label: "Brain Notes", Icon: FileText, angle: -90 },
  { id: "obsidian", label: "Obsidian", Icon: BookOpen, angle: -54 },
  { id: "github", label: "GitHub", Icon: Github, angle: -18 },
  { id: "drive", label: "Drive", Icon: HardDrive, angle: 18 },
  { id: "gmail", label: "Gmail", Icon: Mail, angle: 54 },
  { id: "local", label: "Local files", Icon: Folder, angle: 90 },
  { id: "ollama", label: "Ollama", Icon: Cpu, angle: 126 },
  { id: "cloud", label: "Cloud AI", Icon: Cloud, angle: 162 },
  { id: "missions", label: "Missions", Icon: Rocket, angle: 198 },
  { id: "watchlist", label: "Watchlist", Icon: Eye, angle: 234 }
];

interface RenderNode {
  id: NodeId;
  label: string;
  Icon: typeof Brain;
  x: number;
  y: number;
  state: "active" | "configured" | "manual" | "muted";
  count: number | null;
  detail: string;
}

interface Props {
  compact?: boolean;
  onSelect?: (id: NodeId) => void;
}

export function BrainGraph({ compact = false, onSelect }: Props) {
  const identity = useBrainStore((s) => s.identity);
  const sources = useBrainStore((s) => s.memorySources);
  const engines = useBrainStore((s) => s.engines);
  const missionCount = useBrainStore((s) => s.missionCount);
  const demo = useBrainStore((s) => s.demo);
  const currentMission = useMissionStore((s) => s.current);

  const watchlistCount = readWatchlistCount();

  const size = compact ? 260 : 460;
  const cx = size / 2;
  const cy = size / 2;
  const r = compact ? 92 : 175;

  const nodes = useMemo<RenderNode[]>(() => {
    return ORBIT.map((n) => {
      const rad = (n.angle * Math.PI) / 180;
      const x = cx + Math.cos(rad) * r;
      const y = cy + Math.sin(rad) * r;
      return computeNode(n, x, y, sources, engines, missionCount, watchlistCount);
    });
  }, [cx, cy, r, sources, engines, missionCount, watchlistCount]);

  const [selected, setSelected] = useState<NodeId | null>(null);
  const selectedNode = selected ? nodes.find((n) => n.id === selected) : null;

  const onNodeClick = (id: NodeId) => {
    setSelected(id);
    onSelect?.(id);
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        className="relative mx-auto"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="block">
          {/* edges */}
          {nodes.map((n) => (
            <line
              key={`edge-${n.id}`}
              x1={cx}
              y1={cy}
              x2={n.x}
              y2={n.y}
              stroke={
                n.state === "muted"
                  ? "rgba(255,255,255,0.06)"
                  : "var(--pr-color-accent)"
              }
              strokeOpacity={n.state === "muted" ? 0.5 : 0.35}
              strokeWidth={n.state === "muted" ? 0.6 : 1}
              strokeDasharray={n.state === "muted" ? "2 3" : undefined}
            />
          ))}

          {/* central brain ring */}
          <circle
            cx={cx}
            cy={cy}
            r={compact ? 22 : 32}
            fill="var(--pr-color-accent-soft)"
            opacity={0.18}
          />
          <circle
            cx={cx}
            cy={cy}
            r={compact ? 14 : 22}
            fill="var(--pr-color-accent-soft)"
            opacity={0.35}
          />

          {/* pulse on the missions edge if a mission is in flight */}
          {currentMission && (
            <circle
              cx={(cx + (nodes.find((n) => n.id === "missions")?.x ?? cx)) / 2}
              cy={(cy + (nodes.find((n) => n.id === "missions")?.y ?? cy)) / 2}
              r={3}
              fill="var(--pr-color-accent)"
              opacity={0.85}
            >
              <animate attributeName="opacity" values="0.85;0.1;0.85" dur="1.4s" repeatCount="indefinite" />
            </circle>
          )}
        </svg>

        {/* central brain badge */}
        <button
          type="button"
          onClick={() => onNodeClick("brain")}
          className="absolute flex flex-col items-center justify-center rounded-full transition"
          style={{
            left: cx - (compact ? 22 : 32),
            top: cy - (compact ? 22 : 32),
            width: compact ? 44 : 64,
            height: compact ? 44 : 64
          }}
          title={identity?.name ?? "No brain"}
        >
          <span
            className={clsx(
              "flex items-center justify-center rounded-full ring-1 ring-accent/40 shadow-glow",
              compact ? "h-10 w-10 bg-accent/[0.15]" : "h-14 w-14 bg-accent/[0.18]"
            )}
          >
            <Brain className={compact ? "h-4 w-4 text-accent" : "h-6 w-6 text-accent"} />
          </span>
          {!compact && (
            <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
              {identity?.name ?? "no brain"}
            </span>
          )}
        </button>

        {/* orbital nodes */}
        {nodes.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => onNodeClick(n.id)}
            className="absolute flex flex-col items-center"
            style={{
              left: n.x - (compact ? 12 : 18),
              top: n.y - (compact ? 12 : 18)
            }}
            title={`${n.label} · ${n.state}`}
          >
            <span
              className={clsx(
                "flex items-center justify-center rounded-full transition",
                compact ? "h-6 w-6" : "h-9 w-9",
                n.state === "active"
                  ? "bg-accent/[0.22] ring-1 ring-accent/60 shadow-glow"
                  : n.state === "manual"
                    ? "bg-emerald-500/[0.14] ring-1 ring-emerald-400/35"
                    : n.state === "configured"
                      ? "bg-accent/[0.08] ring-1 ring-accent/25"
                      : "bg-white/[0.025] ring-1 ring-white/8"
              )}
            >
              <n.Icon
                className={clsx(
                  compact ? "h-3 w-3" : "h-4 w-4",
                  n.state === "active"
                    ? "text-accent"
                    : n.state === "manual"
                      ? "text-emerald-200"
                      : n.state === "configured"
                        ? "text-accent/85"
                        : "text-white/45"
                )}
              />
            </span>
            {!compact && (
              <>
                <span className="mt-1 font-mono text-[9.5px] uppercase tracking-wider text-white/65">
                  {n.label}
                </span>
                {n.count !== null && (
                  <span className="font-mono text-[9px] text-white/40">{n.count}</span>
                )}
              </>
            )}
          </button>
        ))}
      </div>

      {demo && !compact && (
        <div className="mx-auto rounded border border-accent/30 bg-accent/[0.08] px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-accent">
          demo data · labelled
        </div>
      )}

      {selectedNode && !compact && (
        <div className="mx-auto w-full max-w-[420px] rounded-xl border border-white/8 bg-white/[0.02] p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <selectedNode.Icon className="h-3.5 w-3.5 text-accent" />
              <span className="text-[12.5px] font-semibold text-white">{selectedNode.label}</span>
            </div>
            <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/55">
              {selectedNode.state}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-white/55">{selectedNode.detail}</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// helpers
// ============================================================================

function readWatchlistCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem("promptready-os.intel-terminal");
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return Object.values(parsed).reduce(
      (acc: number, v) => acc + (Array.isArray(v) ? v.length : 0),
      0
    );
  } catch {
    return 0;
  }
}

function computeNode(
  n: NodeDef,
  x: number,
  y: number,
  sources: MemorySource[],
  engines: { kind: string; state: string }[],
  missionCount: number,
  watchlistCount: number
): RenderNode {
  const find = (k: string) => sources.find((s) => s.kind === k);
  const engine = (k: string) => engines.find((e) => e.kind === k);

  let state: RenderNode["state"] = "muted";
  let count: number | null = null;
  let detail = "Not connected. Add a source to wake this node.";

  switch (n.id) {
    case "notes": {
      const s = find("brain-notes");
      if (s) {
        state = "manual";
        count = readBrainNoteCount();
        detail = `${count} manual brain note${count === 1 ? "" : "s"} captured on this machine.`;
      }
      break;
    }
    case "obsidian": {
      const s = find("obsidian");
      if (s) {
        state = "configured";
        detail = "Obsidian vault declared · indexer wires in with the desktop runtime.";
      }
      break;
    }
    case "github": {
      const s = find("github");
      if (s) {
        state = "configured";
        count = countRepoContexts(sources);
        detail = `${count} repo context${count === 1 ? "" : "s"} pinned. Read-only until indexer ships.`;
      }
      break;
    }
    case "drive": {
      const s = find("drive");
      if (s) {
        state = "configured";
        detail = "Drive folder declared · OAuth pending.";
      }
      break;
    }
    case "gmail": {
      detail = "Gmail · connector planned · not selectable from bootstrap yet.";
      break;
    }
    case "local": {
      const s = find("local-folder");
      if (s) {
        state = "configured";
        detail = "Local folder declared · indexer wires in with desktop runtime.";
      }
      break;
    }
    case "ollama": {
      const e = engine("ollama");
      if (e) {
        state = e.state === "active" ? "active" : "configured";
        detail =
          e.state === "active"
            ? "Local Ollama reachable. Mission router prefers it."
            : "Ollama selected · probe runs on first dispatch.";
      } else {
        detail = "Ollama · not enabled. Add it from Settings → engines.";
      }
      break;
    }
    case "cloud": {
      const e = engine("cloud");
      if (e) {
        state = "configured";
        detail = "Cloud routing declared · provider keys pending.";
      } else {
        detail = "Cloud · not enabled. Cloud is opt-in.";
      }
      break;
    }
    case "missions": {
      count = missionCount;
      state = missionCount > 0 ? "active" : "configured";
      detail = `${missionCount} mission${missionCount === 1 ? "" : "s"} dispatched on this brain.`;
      break;
    }
    case "watchlist": {
      count = watchlistCount;
      state = watchlistCount > 0 ? "manual" : "muted";
      detail =
        watchlistCount > 0
          ? `${watchlistCount} card${watchlistCount === 1 ? "" : "s"} pinned across Intelligence Terminal tabs.`
          : "No cards pinned in Intelligence Terminal yet.";
      break;
    }
  }

  return {
    id: n.id,
    label: n.label,
    Icon: n.Icon,
    x,
    y,
    state,
    count,
    detail
  };
}

function readBrainNoteCount(): number {
  // MemoryPage keeps brain notes in component state today. The count
  // surfaces 0 until persistence wires in — we never invent.
  return 0;
}

function countRepoContexts(sources: MemorySource[]): number {
  return sources.filter((s) => s.kind === "github").length;
}

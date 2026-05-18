"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  Cpu,
  Database,
  Github,
  Loader2,
  Play,
  Plus,
  Rocket,
  ShieldCheck,
  Trash2,
  Upload,
  X
} from "lucide-react";
import {
  useAtlasStore,
  WORKFLOW_NODE_META,
  type WorkflowNode,
  type WorkflowNodeKind,
  type WorkflowRun
} from "@/store/atlas";
import { runWorkflow } from "@/services/workflowRunner";

/**
 * Workflow Canvas · inside Atlas Workflow Layer detail.
 *
 * Free-form canvas: drag to move, click + click to connect, rename
 * inline, delete. Persisted to localStorage via useAtlasStore.
 *
 * Execution stays planned. Save/load is the only real action.
 */

const CANVAS_W = 540;
const CANVAS_H = 260;
const NODE_W = 96;
const NODE_H = 38;

const KIND_ICON: Record<WorkflowNodeKind, typeof Cpu> = {
  mission: Rocket,
  repo: Github,
  memory: Database,
  agent: Cpu,
  export: Upload,
  approval: ShieldCheck
};

export function WorkflowCanvas({ onClose }: { onClose: () => void }) {
  const nodes = useAtlasStore((s) => s.workflowNodes);
  const edges = useAtlasStore((s) => s.workflowEdges);
  const addNode = useAtlasStore((s) => s.addWorkflowNode);
  const moveNode = useAtlasStore((s) => s.moveWorkflowNode);
  const renameNode = useAtlasStore((s) => s.renameWorkflowNode);
  const removeNode = useAtlasStore((s) => s.removeWorkflowNode);
  const toggleEdge = useAtlasStore((s) => s.toggleEdge);
  const clearWorkflow = useAtlasStore((s) => s.clearWorkflow);
  const workflowRuns = useAtlasStore((s) => s.workflowRuns);

  const [connecting, setConnecting] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<WorkflowRun | null>(workflowRuns[0] ?? null);

  const onRun = async () => {
    if (running) return;
    setRunning(true);
    try {
      const r = await runWorkflow({});
      setLastRun(r);
    } finally {
      setRunning(false);
    }
  };
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // drag tracking
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragRef.current || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const nx = Math.max(0, Math.min(CANVAS_W - NODE_W, e.clientX - rect.left - dragRef.current.offsetX));
      const ny = Math.max(0, Math.min(CANVAS_H - NODE_H, e.clientY - rect.top - dragRef.current.offsetY));
      moveNode(dragRef.current.id, nx, ny);
    },
    [moveNode]
  );
  const onMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  const onNodeMouseDown = (e: React.MouseEvent, n: WorkflowNode) => {
    // Don't start drag if connecting / renaming
    if (connecting || renaming) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    dragRef.current = {
      id: n.id,
      offsetX: e.clientX - rect.left - n.x,
      offsetY: e.clientY - rect.top - n.y
    };
  };

  const onNodeClick = (id: string) => {
    if (!connecting) return;
    if (connecting === id) {
      setConnecting(null);
      return;
    }
    toggleEdge(connecting, id);
    setConnecting(null);
  };

  const onAdd = (kind: WorkflowNodeKind) => {
    addNode({
      kind,
      label: WORKFLOW_NODE_META[kind].label,
      x: 24 + ((nodes.length * 24) % (CANVAS_W - NODE_W - 24)),
      y: 24 + ((nodes.length * 18) % (CANVAS_H - NODE_H - 24))
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <header className="flex items-center justify-between">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
          workflow canvas · planned execution
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={clearWorkflow}
            className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/65 hover:bg-white/[0.06]"
          >
            clear
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-0.5 text-white/55 hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-1">
        {(Object.keys(WORKFLOW_NODE_META) as WorkflowNodeKind[]).map((k) => {
          const Icon = KIND_ICON[k];
          return (
            <button
              key={k}
              type="button"
              onClick={() => onAdd(k)}
              className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/75 hover:bg-white/[0.06]"
            >
              <Plus className="h-2.5 w-2.5" />
              <Icon className="h-3 w-3 text-accent" /> {k}
            </button>
          );
        })}
        <span className="ml-auto font-mono text-[9.5px] uppercase tracking-wider text-white/40">
          drag · click two nodes to connect
        </span>
      </div>

      <div
        ref={canvasRef}
        className="relative overflow-hidden rounded-md border border-white/10 bg-graphite-900/60"
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          backgroundImage:
            "linear-gradient(rgba(124,155,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(124,155,255,0.05) 1px, transparent 1px)",
          backgroundSize: "20px 20px"
        }}
      >
        <svg className="pointer-events-none absolute inset-0" width={CANVAS_W} height={CANVAS_H}>
          {edges.map((e) => {
            const a = nodes.find((n) => n.id === e.from);
            const b = nodes.find((n) => n.id === e.to);
            if (!a || !b) return null;
            const x1 = a.x + NODE_W / 2;
            const y1 = a.y + NODE_H / 2;
            const x2 = b.x + NODE_W / 2;
            const y2 = b.y + NODE_H / 2;
            return (
              <line
                key={`${e.from}-${e.to}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--pr-color-accent)"
                strokeOpacity={0.55}
                strokeWidth={1}
                markerEnd="url(#wf-arrow)"
              />
            );
          })}
          <defs>
            <marker id="wf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--pr-color-accent)" opacity={0.65} />
            </marker>
          </defs>
        </svg>

        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-[11px] text-white/45">
            Empty canvas · add a node from the rail above.
          </div>
        )}

        {nodes.map((n) => {
          const Icon = KIND_ICON[n.kind];
          const selected = connecting === n.id;
          return (
            <div
              key={n.id}
              onMouseDown={(e) => onNodeMouseDown(e, n)}
              onClick={() => onNodeClick(n.id)}
              onDoubleClick={() => setRenaming({ id: n.id, value: n.label })}
              className={clsx(
                "absolute flex select-none items-center gap-1 rounded-md border px-2 text-[11px]",
                selected
                  ? "border-accent/60 bg-accent/[0.18] shadow-glow"
                  : "border-white/10 bg-graphite-800/70 hover:border-accent/30",
                connecting ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"
              )}
              style={{ left: n.x, top: n.y, width: NODE_W, height: NODE_H }}
              title={WORKFLOW_NODE_META[n.kind].blurb}
            >
              <Icon className="h-3 w-3 shrink-0 text-accent" />
              {renaming?.id === n.id ? (
                <input
                  autoFocus
                  value={renaming.value}
                  onChange={(e) => setRenaming({ id: n.id, value: e.target.value })}
                  onBlur={() => {
                    renameNode(n.id, renaming.value.trim() || WORKFLOW_NODE_META[n.kind].label);
                    setRenaming(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") setRenaming(null);
                  }}
                  className="min-w-0 flex-1 rounded-sm bg-transparent text-[11px] text-white focus:outline-none"
                />
              ) : (
                <span className="min-w-0 flex-1 truncate text-white/90">{n.label}</span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeNode(n.id);
                }}
                className="rounded p-0.5 text-white/35 hover:bg-white/[0.06] hover:text-white/85"
                aria-label="Remove node"
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() =>
            setConnecting(connecting ? null : nodes[0]?.id ?? null)
          }
          disabled={nodes.length < 2}
          className={clsx(
            "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-40",
            connecting
              ? "border-accent/40 bg-accent/[0.08] text-accent"
              : "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.06]"
          )}
        >
          {connecting ? "click target to link" : "connect mode"}
        </button>
        <button
          type="button"
          onClick={onRun}
          disabled={running || nodes.length === 0}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent/90 px-2.5 py-1 text-[11px] font-semibold text-white shadow-glow transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
          {running ? "Running" : "Run workflow"}
        </button>
        <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/40">
          nodes: {nodes.length} · edges: {edges.length} · runs: {workflowRuns.length}
        </span>
      </div>

      {lastRun && (
        <div className="rounded-md border border-white/8 bg-black/30 p-2">
          <header className="mb-1 flex items-center justify-between">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
              last run · {lastRun.status}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-white/45">
              {lastRun.steps.length} step{lastRun.steps.length === 1 ? "" : "s"}
            </span>
          </header>
          <ul className="flex flex-col gap-0.5 font-mono text-[10px]">
            {lastRun.steps.map((s, i) => (
              <li key={i} className="flex items-center gap-2">
                <span
                  className={clsx(
                    "uppercase tracking-wider",
                    s.state === "ok"
                      ? "text-emerald-300/85"
                      : s.state === "blocked"
                        ? "text-rose-300/85"
                        : s.state === "approval-required"
                          ? "text-amber-300/85"
                          : "text-white/45"
                  )}
                >
                  {s.state}
                </span>
                <span className="rounded border border-white/10 bg-white/[0.03] px-1 py-px uppercase tracking-wider text-white/45">
                  {s.kind}
                </span>
                <span className="truncate text-white/75">{s.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

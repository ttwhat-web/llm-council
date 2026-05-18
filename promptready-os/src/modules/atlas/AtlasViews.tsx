"use client";

import { useMemo } from "react";
import clsx from "clsx";
import { Activity, Brain, Coins, Rocket, Radar, ShieldCheck, Users } from "lucide-react";
import { useBrainStore } from "@/store/brain";
import { useMissionStore, STAGE_META, STAGES } from "@/store/mission";
import { useAtlasStore, type AgentKind, type AgentState } from "@/store/atlas";
import { computeCostBoard, formatUsd, PRICING } from "@/services/cost";

/**
 * Operations + Live views for the Atlas home-mode toggle.
 *
 * Operations · what the operator is actively working on right now:
 *              current mission, attached repos, pinned terminal cards,
 *              recent receipts, pinned deliverables.
 *
 * Live       · mission stage stream + flight recorder for the current
 *              mission. Idle when no mission is in flight.
 */

export function OperationsView({ onOpenSection }: { onOpenSection: (id: string) => void }) {
  const current = useMissionStore((s) => s.current);
  const history = useMissionStore((s) => s.history);
  const sources = useBrainStore((s) => s.memorySources);
  const workflowRuns = useAtlasStore((s) => s.workflowRuns);
  const inbox = useAtlasStore((s) => s.inbox);
  const memoryDocs = useAtlasStore((s) => s.memoryDocs);
  const agents = useAtlasStore((s) => s.agents);
  const setAgentState = useAtlasStore((s) => s.setAgentState);

  const repos = sources.filter((s) => s.kind === "github");
  const recent = history.slice(0, 6);
  const blocked = workflowRuns.filter((r) => r.status === "blocked").length;
  const awaitingApproval = workflowRuns.filter((r) => r.status === "awaiting-approval").length;
  const recentImports = memoryDocs.slice(0, 3);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <RadarPanel
        current={current}
        receipts={history.length}
        blocked={blocked}
        awaitingApproval={awaitingApproval}
        repos={repos.length}
        imports={memoryDocs.length}
        inbox={inbox.length}
      />

      <CostBoardPanel />

      <AgentQueuePanel agents={agents} onCycle={setAgentState} />

      <Card eyebrow="active mission" title={current ? "In flight" : "Idle"}>
        {current ? (
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[10.5px] uppercase tracking-wider text-accent">
              {current.id}
            </span>
            <span className="line-clamp-2 text-[11.5px] text-white/80">{current.brief.slice(0, 120)}</span>
            <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/45">
              stage: {current.stage}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onOpenSection("mission-system")}
            className="inline-flex items-center gap-1.5 self-start rounded-md bg-accent/85 px-2 py-1 text-[11.5px] font-semibold text-white shadow-glow hover:bg-accent"
          >
            <Rocket className="h-3 w-3" /> Dispatch one
          </button>
        )}
      </Card>

      <Card eyebrow="recent receipts" title={`${history.length} archived`}>
        {recent.length === 0 ? (
          <p className="text-[11px] text-white/55">Archive empty.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-[11px]">
            {recent.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-md border border-white/8 bg-white/[0.012] px-1.5 py-1"
              >
                <span className="truncate text-white/80">{m.brief.slice(0, 36)}</span>
                <span className="font-mono text-[9px] uppercase tracking-wider text-white/45">
                  {m.stage === "deliverable-ready" ? "ready" : m.stage}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card eyebrow="attached repos" title={`${repos.length} manual`}>
        {repos.length === 0 ? (
          <button
            type="button"
            onClick={() => onOpenSection("repo-layer")}
            className="inline-flex items-center gap-1.5 self-start rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[10.5px] uppercase tracking-wider text-white/75 hover:bg-white/[0.06]"
          >
            attach a repo →
          </button>
        ) : (
          <ul className="flex flex-col gap-1 text-[11px]">
            {repos.slice(0, 4).map((r) => (
              <li
                key={r.id}
                className="truncate rounded-md border border-white/8 bg-white/[0.012] px-1.5 py-1 font-mono text-white/80"
              >
                {r.label}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card eyebrow="brain shape" title="What's connected">
        <ul className="flex flex-col gap-1 text-[11px]">
          <li className="flex justify-between text-white/75">
            <span>sources</span>
            <span className="font-mono text-white">{sources.length}</span>
          </li>
          <li className="flex justify-between text-white/75">
            <span>repos</span>
            <span className="font-mono text-white">{repos.length}</span>
          </li>
          <li className="flex justify-between text-white/75">
            <span>missions archived</span>
            <span className="font-mono text-white">{history.length}</span>
          </li>
        </ul>
      </Card>

      <Card eyebrow="safety" title="Screen armed">
        <p className="flex items-start gap-1.5 text-[11px] text-white/60">
          <ShieldCheck className="mt-0.5 h-3 w-3 text-emerald-300/85" />
          Every destructive action shows a preview before it runs. Mobile companion (planned) will mirror approvals.
        </p>
      </Card>

      <Card eyebrow="atlas tip" title="One screen home">
        <p className="text-[11px] text-white/60">
          Switch to <span className="font-mono">Blueprint</span> for the full living map. <span className="font-mono">Live</span> shows the active mission's stages as they happen.
        </p>
      </Card>
    </div>
  );
}

export function LiveView() {
  const current = useMissionStore((s) => s.current);
  const history = useMissionStore((s) => s.history);
  const stageIdx = current ? STAGES.indexOf(current.stage) : 0;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
      <section className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.018] p-4 shadow-glass">
        <header className="flex items-center justify-between border-b border-white/5 pb-2">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
            live · execution graph
          </span>
          <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/55">
            {current ? `mission ${current.id}` : "no mission"}
          </span>
        </header>
        <ol className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
          {STAGES.filter((s) => s !== "idle").map((s, i) => {
            const idx = i + 1;
            const state = stageIdx > idx ? "done" : stageIdx === idx ? "current" : "pending";
            return (
              <li
                key={s}
                className={clsx(
                  "flex items-center justify-between rounded-md border px-2 py-1.5",
                  state === "current"
                    ? "border-accent/40 bg-accent/[0.08] shadow-glow"
                    : state === "done"
                      ? "border-emerald-400/25 bg-emerald-500/[0.04]"
                      : "border-white/8 bg-white/[0.012]"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={clsx(
                      "font-mono text-[9.5px] uppercase tracking-[0.2em]",
                      state === "current"
                        ? "text-accent"
                        : state === "done"
                          ? "text-emerald-300"
                          : "text-white/35"
                    )}
                  >
                    {STAGE_META[s].code}
                  </span>
                  <span className="text-[11.5px] text-white">{STAGE_META[s].label}</span>
                </div>
                <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/45">
                  {state}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.018] p-4">
        <header className="flex items-center justify-between border-b border-white/5 pb-2">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
            flight recorder
          </span>
        </header>
        <div className="rounded-md border border-white/8 bg-black/30 p-3">
          {current && current.events.length > 0 ? (
            <ul className="flex max-h-[260px] flex-col gap-1 overflow-auto font-mono text-[10.5px]">
              {current.events.map((e, i) => (
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
          ) : (
            <ul className="flex flex-col gap-1 font-mono text-[10.5px] text-white/55">
              <li className="flex items-center gap-2">
                <Brain className="h-3 w-3 text-accent" />
                <span>{history.length} mission{history.length === 1 ? "" : "s"} archived locally</span>
              </li>
              <li className="flex items-center gap-2">
                <Activity className="h-3 w-3 text-accent" />
                <span>No mission in flight · standby</span>
              </li>
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function CostBoardPanel() {
  const history = useMissionStore((s) => s.history);
  const board = useMemo(() => computeCostBoard(history), [history]);
  const rows: Array<{ label: string; value: string; tone: "ok" | "muted" }> = [
    { label: "local missions", value: String(board.localMissions), tone: board.localMissions > 0 ? "ok" : "muted" },
    { label: "ollama missions", value: String(board.ollamaMissions), tone: board.ollamaMissions > 0 ? "ok" : "muted" },
    { label: "total deliverables", value: String(board.totalDeliverables), tone: board.totalDeliverables > 0 ? "ok" : "muted" },
    { label: "ollama tokens", value: `${board.totalOllamaTokens}`, tone: board.totalOllamaTokens > 0 ? "ok" : "muted" },
    { label: "ollama latency (sum)", value: `${(board.totalOllamaLatencyMs / 1000).toFixed(1)}s`, tone: "muted" },
    { label: "est. tokens saved", value: String(board.estimatedTokensSaved), tone: board.estimatedTokensSaved > 0 ? "ok" : "muted" },
    { label: "est. cloud cost avoided", value: formatUsd(board.estimatedCloudCostAvoidedUSD), tone: board.estimatedCloudCostAvoidedUSD > 0 ? "ok" : "muted" }
  ];
  return (
    <Card eyebrow="cost board" title="What you didn't pay for">
      <ul className="flex flex-col gap-1 text-[11px]">
        {rows.map((r) => (
          <li
            key={r.label}
            className="flex items-center justify-between rounded-md border border-white/8 bg-white/[0.012] px-2 py-1"
          >
            <span className="text-white/70">{r.label}</span>
            <span
              className={clsx(
                "font-mono",
                r.tone === "ok" ? "text-emerald-300/85" : "text-white/55"
              )}
            >
              {r.value}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-white/45">
        <Coins className="mr-1 inline h-3 w-3 text-accent" />
        estimate model · {PRICING.modelLabel} · input ${PRICING.inputPer1M}/1M · output ${PRICING.outputPer1M}/1M ·
        avg brief {board.estimatedAvgBriefTokens}t · avg resp {board.estimatedAvgResponseTokens}t
      </p>
    </Card>
  );
}

function RadarPanel({
  current,
  receipts,
  blocked,
  awaitingApproval,
  repos,
  imports,
  inbox
}: {
  current: ReturnType<typeof useMissionStore.getState>["current"];
  receipts: number;
  blocked: number;
  awaitingApproval: number;
  repos: number;
  imports: number;
  inbox: number;
}) {
  const rows: Array<{ label: string; value: string; tone: "ok" | "warn" | "muted" }> = [
    {
      label: "running missions",
      value: current ? "1" : "0",
      tone: current ? "ok" : "muted"
    },
    { label: "blocked workflows", value: String(blocked), tone: blocked > 0 ? "warn" : "muted" },
    { label: "approval waits", value: String(awaitingApproval), tone: awaitingApproval > 0 ? "warn" : "muted" },
    { label: "recent receipts", value: String(receipts), tone: receipts > 0 ? "ok" : "muted" },
    { label: "repo activity", value: String(repos), tone: repos > 0 ? "ok" : "muted" },
    { label: "memory imports", value: String(imports), tone: imports > 0 ? "ok" : "muted" },
    { label: "inbox", value: String(inbox), tone: inbox > 0 ? "ok" : "muted" }
  ];
  return (
    <Card eyebrow="mission radar" title="Local-only signals">
      <ul className="flex flex-col gap-1 text-[11px]">
        {rows.map((r) => (
          <li
            key={r.label}
            className="flex items-center justify-between rounded-md border border-white/8 bg-white/[0.012] px-2 py-1"
          >
            <span className="text-white/70">{r.label}</span>
            <span
              className={clsx(
                "font-mono",
                r.tone === "ok"
                  ? "text-emerald-300/85"
                  : r.tone === "warn"
                    ? "text-amber-300/85"
                    : "text-white/55"
              )}
            >
              {r.value}
            </span>
          </li>
        ))}
      </ul>
      <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/40">
        <Radar className="mr-1 inline h-3 w-3 text-accent" /> no fake metrics
      </span>
    </Card>
  );
}

function AgentQueuePanel({
  agents,
  onCycle
}: {
  agents: Array<{ kind: AgentKind; state: AgentState }>;
  onCycle: (kind: AgentKind, state: AgentState) => void;
}) {
  const cycle = (cur: AgentState): AgentState => {
    const order: AgentState[] = ["idle", "running", "blocked", "waiting", "approval"];
    const i = order.indexOf(cur);
    return order[(i + 1) % order.length];
  };
  return (
    <Card eyebrow="agent queue" title="Status only · no autonomous execution">
      <ul className="flex flex-col gap-1 text-[11px]">
        {agents.map((a) => (
          <li
            key={a.kind}
            className="flex items-center justify-between rounded-md border border-white/8 bg-white/[0.012] px-2 py-1"
          >
            <span className="flex items-center gap-1.5">
              <Users className="h-3 w-3 text-accent" />
              <span className="text-white/85">{a.kind}</span>
            </span>
            <button
              type="button"
              onClick={() => onCycle(a.kind, cycle(a.state))}
              className={
                a.state === "running"
                  ? "rounded border border-emerald-400/30 bg-emerald-500/[0.08] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-emerald-200"
                  : a.state === "blocked"
                    ? "rounded border border-rose-400/30 bg-rose-500/[0.08] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-rose-200"
                    : a.state === "approval"
                      ? "rounded border border-amber-400/30 bg-amber-500/[0.08] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-200"
                      : a.state === "waiting"
                        ? "rounded border border-accent/30 bg-accent/[0.08] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-accent"
                        : "rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/55"
              }
              title="cycle state · runtime ships with desktop"
            >
              {a.state}
            </button>
          </li>
        ))}
      </ul>
      <p className="text-[10.5px] text-white/45">
        Owner-only state today. Click a state to cycle through{" "}
        <span className="font-mono">idle → running → blocked → waiting → approval</span>.
      </p>
    </Card>
  );
}

function Card({
  eyebrow,
  title,
  children
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <header className="flex flex-col gap-0.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-accent">
          {eyebrow}
        </span>
        <span className="text-[13px] font-semibold text-white">{title}</span>
      </header>
      {children}
    </article>
  );
}

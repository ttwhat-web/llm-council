"use client";

import { useEffect, useState } from "react";
import { Activity, Loader2, Sparkles } from "lucide-react";
import { measureBrainHealth, optimizeBrain, type BrainHealth, type OptimizeReport } from "@/services/brainHealth";
import { useBrainStore } from "@/store/brain";
import { useMissionStore } from "@/store/mission";
import { useAtlasStore } from "@/store/atlas";

/**
 * Brain Score · S3.10
 *
 * Single 0-100 number that distils Brain Health into one operator-
 * facing signal. All inputs are real local counts — nothing is faked.
 *
 *   start at 50 (a brand new brain is a blank operator)
 *   +1 per mission archived (cap +20)
 *   +1 per memory doc imported (cap +10)
 *   +2 per repo source attached (cap +10)
 *   +2 per snapshot held (cap +10)
 *   +1 per workflow node (cap +6)
 *   -3 per duplicate doc
 *   -2 per stale repo
 *   -2 per unused workflow node
 *   -2 per orphan file
 *   -1 per archived inbox item
 *
 * The formula is exposed in the card so the operator can see how the
 * score was computed.
 */

interface Score {
  value: number;
  breakdown: Array<{ label: string; delta: number; note?: string }>;
  recommendation: string;
}

function computeScore(): Score {
  const h: BrainHealth = measureBrainHealth();
  const brain = useBrainStore.getState();
  const missions = useMissionStore.getState();

  const base = 50;
  const missionsBonus = Math.min(20, missions.history.length);
  const importsBonus = Math.min(10, h.memoryDocs);
  const reposBonus = Math.min(10, brain.memorySources.filter((s) => s.kind === "github").length * 2);
  const snapshotsBonus = Math.min(10, h.snapshots * 2);
  const workflowBonus = Math.min(6, h.workflowNodes);

  const dupPenalty = h.duplicateDocs * 3;
  const stalePenalty = h.staleRepos * 2;
  const unusedPenalty = h.unusedWorkflowNodes * 2;
  const orphanPenalty = h.orphanFiles * 2;
  const archivedPenalty = h.inboxArchived;

  const raw =
    base +
    missionsBonus +
    importsBonus +
    reposBonus +
    snapshotsBonus +
    workflowBonus -
    dupPenalty -
    stalePenalty -
    unusedPenalty -
    orphanPenalty -
    archivedPenalty;
  const value = Math.max(0, Math.min(100, Math.round(raw)));

  const breakdown: Score["breakdown"] = [
    { label: "base", delta: base, note: "every brain starts here" },
    { label: "missions archived", delta: missionsBonus, note: `${missions.history.length} total · cap +20` },
    { label: "imports", delta: importsBonus, note: `${h.memoryDocs} docs · cap +10` },
    { label: "repo sources", delta: reposBonus, note: `× 2 · cap +10` },
    { label: "snapshots", delta: snapshotsBonus, note: `${h.snapshots} held · × 2 · cap +10` },
    { label: "workflow nodes", delta: workflowBonus, note: `${h.workflowNodes} on canvas · cap +6` }
  ];
  if (dupPenalty) breakdown.push({ label: "duplicate docs", delta: -dupPenalty });
  if (stalePenalty) breakdown.push({ label: "stale repos", delta: -stalePenalty });
  if (unusedPenalty) breakdown.push({ label: "unused workflow nodes", delta: -unusedPenalty });
  if (orphanPenalty) breakdown.push({ label: "orphan files", delta: -orphanPenalty });
  if (archivedPenalty) breakdown.push({ label: "archived inbox", delta: -archivedPenalty });

  let recommendation = "Brain is healthy · keep dispatching missions.";
  if (value < 50) recommendation = "Brain needs attention · run Optimize to clean duplicates and stale items.";
  else if (value < 70) recommendation = "Brain has room to grow · import a few repo docs or run more missions.";
  else if (value < 90) recommendation = "Brain is solid · take a snapshot before risky changes.";
  else recommendation = "Brain is excellent · share a `.brainpack` with your team.";

  return { value, breakdown, recommendation };
}

export function BrainScoreCard() {
  // Re-measure on common store changes so the score reflects reality.
  const sourcesLen = useBrainStore((s) => s.memorySources.length);
  const historyLen = useMissionStore((s) => s.history.length);
  const docsLen = useAtlasStore((s) => s.memoryDocs.length);
  const snapsLen = useAtlasStore((s) => s.snapshots.length);
  const nodesLen = useAtlasStore((s) => s.workflowNodes.length);
  void sourcesLen;
  void historyLen;
  void docsLen;
  void snapsLen;
  void nodesLen;

  const [score, setScore] = useState<Score>(() => computeScore());
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    setScore(computeScore());
  }, [sourcesLen, historyLen, docsLen, snapsLen, nodesLen]);

  const onOptimize = () => {
    if (busy) return;
    setBusy(true);
    try {
      const r: OptimizeReport = optimizeBrain();
      const removed =
        r.duplicateDocsRemoved +
        r.oldReceiptsRemoved +
        r.unusedWorkflowNodesRemoved +
        r.orphanFilesRemoved +
        r.archivedInboxRemoved;
      setFlash(
        removed > 0
          ? `optimized · removed ${removed} item${removed === 1 ? "" : "s"}`
          : "brain already clean · nothing to drop"
      );
      setScore(computeScore());
    } finally {
      setBusy(false);
      window.setTimeout(() => setFlash(null), 4000);
    }
  };

  const tone =
    score.value >= 90
      ? "text-emerald-300"
      : score.value >= 70
        ? "text-accent"
        : score.value >= 50
          ? "text-amber-300"
          : "text-rose-300";

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Brain Score</span>
        </div>
        <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/55">
          local · computed live
        </span>
      </header>

      <div className="flex items-center gap-4">
        <span className={`font-mono text-[40px] font-bold leading-none ${tone}`}>{score.value}</span>
        <span className="font-mono text-[18px] text-white/40">/100</span>
        <p className="flex-1 text-[11.5px] text-white/65">{score.recommendation}</p>
      </div>

      <ul className="mt-3 grid grid-cols-1 gap-1 md:grid-cols-2">
        {score.breakdown.map((b) => (
          <li
            key={b.label}
            className="flex items-center justify-between rounded-md border border-white/8 bg-white/[0.012] px-2 py-1 text-[11px]"
          >
            <span className="text-white/75">{b.label}</span>
            <div className="flex items-center gap-2">
              {b.note && (
                <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/40">
                  {b.note}
                </span>
              )}
              <span
                className={
                  b.delta >= 0
                    ? "rounded border border-emerald-400/30 bg-emerald-500/[0.08] px-1.5 py-0.5 font-mono text-[9.5px] text-emerald-200"
                    : "rounded border border-rose-400/30 bg-rose-500/[0.08] px-1.5 py-0.5 font-mono text-[9.5px] text-rose-200"
                }
              >
                {b.delta >= 0 ? `+${b.delta}` : b.delta}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onOptimize}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent/90 px-3 py-1.5 text-[12px] font-semibold text-white shadow-glow transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Improve Brain
        </button>
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/45">
          drops duplicates · stale repos · unused workflow · orphan files · archived inbox
        </span>
      </div>

      {flash && (
        <p className="mt-2 rounded-md border border-accent/30 bg-accent/[0.08] px-2 py-1 font-mono text-[10.5px] uppercase tracking-wider text-accent">
          {flash}
        </p>
      )}
    </section>
  );
}

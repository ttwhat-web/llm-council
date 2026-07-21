/**
 * Operator rank · UX RESET 03.
 *
 * Pure read-only derivations from existing stores. No new data is
 * invented · no store touched.
 *
 *   age days       · days since brain.identity.createdAt
 *   maturity %     · 0–100, same formula as BrainScoreCard
 *   level          · tier label derived from counters
 *   rank           · single label · "Explorer" → "Operator"
 *
 * If demo data is loaded, the caller surfaces a DEMO badge alongside.
 */

import { useBrainStore } from "@/store/brain";
import { useMissionStore } from "@/store/mission";
import { useAtlasStore } from "@/store/atlas";
import { measureBrainHealth } from "@/services/brainHealth";

export interface OperatorRankSnapshot {
  ageDays: number;
  maturityPct: number;
  levelLabel: string;
  rank: OperatorRank;
  rankLevel: number; // I · II · III suffix
  source: { missions: number; receipts: number; repos: number; imports: number };
  demo: boolean;
}

export type OperatorRank =
  | "Explorer"
  | "Builder"
  | "Founder"
  | "Architect"
  | "Operator";

export function readOperatorRank(): OperatorRankSnapshot {
  const brain = useBrainStore.getState();
  const missions = useMissionStore.getState();
  const atlas = useAtlasStore.getState();
  const h = measureBrainHealth();

  // Age · days since brain creation (0 if no brain yet).
  const ageDays = brain.identity?.createdAt
    ? Math.max(0, Math.floor((Date.now() - brain.identity.createdAt) / 86_400_000))
    : 0;

  // Maturity · matches BrainScoreCard.
  const base = 50;
  const bonuses =
    Math.min(20, missions.history.length) +
    Math.min(10, atlas.memoryDocs.length) +
    Math.min(10, atlas.workflowNodes.length) +
    Math.min(10, h.snapshots * 2);
  const penalties =
    h.duplicateDocs * 3 +
    h.staleRepos * 2 +
    h.unusedWorkflowNodes * 2 +
    h.orphanFiles * 2 +
    h.inboxArchived;
  const maturityPct = Math.max(0, Math.min(100, Math.round(base + bonuses - penalties)));

  // Rank · derived from counter mix (no fake bumps).
  const missionsCount = missions.history.length;
  const reposCount = brain.memorySources.filter((s) => s.kind === "github").length;
  const importsCount = atlas.memoryDocs.length;
  const workflowsCount = atlas.workflowNodes.length;

  const rank = chooseRank({
    missions: missionsCount,
    repos: reposCount,
    imports: importsCount,
    workflows: workflowsCount
  });

  // Level suffix · I / II / III, tied to total operator volume.
  const totalSignal = missionsCount + reposCount * 3 + importsCount + workflowsCount * 2;
  const rankLevel = totalSignal >= 25 ? 3 : totalSignal >= 10 ? 2 : 1;

  // Founder I · Builder II etc.
  const roman = rankLevel === 3 ? "III" : rankLevel === 2 ? "II" : "I";

  // BrainMode currently has no "founder" value · creator/researcher/builder/
  // trader/custom. The rank derivation above is purely counter-driven.
  const finalRank: OperatorRank = rank;

  const levelLabel = `${finalRank} ${roman}`;

  return {
    ageDays,
    maturityPct,
    levelLabel,
    rank: finalRank,
    rankLevel,
    source: {
      missions: missionsCount,
      receipts: missionsCount,
      repos: reposCount,
      imports: importsCount
    },
    demo: brain.demo
  };
}

function chooseRank(args: {
  missions: number;
  repos: number;
  imports: number;
  workflows: number;
}): OperatorRank {
  const { missions, repos, imports, workflows } = args;

  // Explorer · cold start (basically nothing).
  if (missions + repos + imports + workflows < 3) return "Explorer";

  // Architect · workflow-heavy (chained execution).
  if (workflows >= 4 && missions >= 5) return "Architect";

  // Builder · repo + imports rich.
  if (repos >= 2 || imports >= 6) return "Builder";

  // Founder · balanced + a brand of brain.
  if (missions >= 5 && repos >= 1) return "Founder";

  // Operator · default for a working brain.
  return "Operator";
}

export interface MorningBrief {
  yesterday: {
    missions: number;
    receipts: number;
    imports: number;
    repos: number;
    snapshots: number;
  };
  pendingApprovals: number;
  healthPct: number;
  suggestion: string | null;
}

/** Build the Morning Brief snapshot · everything real from local stores. */
export function readMorningBrief(): MorningBrief {
  const missions = useMissionStore.getState();
  const atlas = useAtlasStore.getState();
  const brain = useBrainStore.getState();
  const h = measureBrainHealth();

  const dayStart = startOfDay(new Date()).getTime();
  const yesterdayStart = dayStart - 86_400_000;
  const yesterdayEnd = dayStart;

  const inYesterday = (ts: number) => ts >= yesterdayStart && ts < yesterdayEnd;

  const missionsY = missions.history.filter((m) => inYesterday(m.startedAt)).length;
  const importsY = atlas.memoryDocs.filter((d) => inYesterday(d.addedAt)).length;
  const reposY = brain.memorySources.filter(
    (s) => s.kind === "github"
    // we don't track createdAt on memory sources today · best-effort 0
  ).length === 0
    ? 0
    : 0; // honest: no createdAt timestamp on sources, skip
  const snapshotsY = atlas.snapshots.filter((s) => inYesterday(s.createdAt)).length;

  const pendingApprovals = atlas.workflowRuns.filter((r) => r.status === "awaiting-approval").length;

  // Health from same formula.
  const base = 50;
  const bonuses =
    Math.min(20, missions.history.length) +
    Math.min(10, atlas.memoryDocs.length) +
    Math.min(10, atlas.workflowNodes.length) +
    Math.min(10, h.snapshots * 2);
  const penalties =
    h.duplicateDocs * 3 +
    h.staleRepos * 2 +
    h.unusedWorkflowNodes * 2 +
    h.orphanFiles * 2 +
    h.inboxArchived;
  const healthPct = Math.max(0, Math.min(100, Math.round(base + bonuses - penalties)));

  let suggestion: string | null = null;
  if (h.duplicateDocs > 0) suggestion = `cleanup ${h.duplicateDocs} duplicate doc${h.duplicateDocs === 1 ? "" : "s"}`;
  else if (h.staleRepos > 0) suggestion = `${h.staleRepos} repo${h.staleRepos === 1 ? "" : "s"} look stale · review`;
  else if (pendingApprovals > 0) suggestion = `clear ${pendingApprovals} pending approval${pendingApprovals === 1 ? "" : "s"}`;
  else if (missions.history.length === 0) suggestion = "dispatch your first mission";
  else if (atlas.memoryDocs.length === 0) suggestion = "import a few docs to deepen the brain";

  return {
    yesterday: {
      missions: missionsY,
      receipts: missionsY,
      imports: importsY,
      repos: reposY,
      snapshots: snapshotsY
    },
    pendingApprovals,
    healthPct,
    suggestion
  };
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Runtime heat values · counters per runtime · used by the heatmap card. */
export interface RuntimeHeat {
  label: string;
  value: number;
  /** Where this number comes from · shown in tooltip. */
  source: string;
}

export function readRuntimeHeat(): RuntimeHeat[] {
  const brain = useBrainStore.getState();
  const missions = useMissionStore.getState();
  const atlas = useAtlasStore.getState();
  return [
    { label: "Mission", value: missions.history.length, source: "archived receipts" },
    { label: "Memory", value: atlas.memoryDocs.length, source: "imported docs" },
    { label: "Repo", value: brain.memorySources.filter((s) => s.kind === "github").length, source: "github sources" },
    { label: "Workflow", value: atlas.workflowNodes.length, source: "canvas nodes" },
    { label: "Delivery", value: atlas.pinnedDeliverables.length, source: "pinned deliverables" },
    { label: "Remote", value: atlas.bridgeMessages.length, source: "bridge messages" }
  ];
}

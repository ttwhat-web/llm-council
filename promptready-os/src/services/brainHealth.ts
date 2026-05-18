/**
 * Brain Health · Phase 18.
 *
 * Honest measurements of what's accumulating on disk, plus a real
 * Optimize Brain action that drops genuinely useless things:
 *   · duplicate memory docs (same name + body length)
 *   · receipts older than 60 days (only when > 50 total)
 *   · workflow nodes/edges with zero recorded runs after 30 days
 *
 * Nothing the operator might still want is touched silently — the
 * caller sees exactly what was removed before / after.
 */

import { useBrainStore } from "@/store/brain";
import { useMissionStore, type MissionReceipt } from "@/store/mission";
import { useAtlasStore } from "@/store/atlas";

export interface BrainHealth {
  storageBytes: number;
  storageKeys: number;
  memoryDocs: number;
  duplicateDocs: number;
  receipts: number;
  oldReceipts: number;
  snapshots: number;
  imports: number;
  staleRepos: number;
  workflowNodes: number;
  workflowEdges: number;
  unusedWorkflowNodes: number;
  orphanFiles: number;
  inboxArchived: number;
}

const STALE_REPO_DAYS = 30;
const OLD_RECEIPT_DAYS = 60;
const UNUSED_WORKFLOW_DAYS = 30;
const RECEIPT_PRUNE_THRESHOLD = 50;

export function measureBrainHealth(): BrainHealth {
  const atlas = useAtlasStore.getState();
  const brain = useBrainStore.getState();
  const missions = useMissionStore.getState();

  const storage = approxLocalStorage();
  const dup = duplicateMemoryDocCount(atlas.memoryDocs);
  const old = oldReceiptCount(missions.history);
  const stale = staleRepoCount(brain.memorySources, missions.history);
  const unused = unusedWorkflowNodeCount(atlas.workflowNodes, atlas.workflowRuns);
  const orphan = orphanFileCount(atlas.files, atlas.memoryDocs);
  const archived = atlas.inbox.filter((i) => i.state === "archived").length;

  return {
    storageBytes: storage.bytes,
    storageKeys: storage.keys,
    memoryDocs: atlas.memoryDocs.length,
    duplicateDocs: dup,
    receipts: missions.history.length,
    oldReceipts: old,
    snapshots: atlas.snapshots.length,
    imports: atlas.memoryDocs.length,
    staleRepos: stale,
    workflowNodes: atlas.workflowNodes.length,
    workflowEdges: atlas.workflowEdges.length,
    unusedWorkflowNodes: unused,
    orphanFiles: orphan,
    inboxArchived: archived
  };
}

export interface OptimizeReport {
  duplicateDocsRemoved: number;
  oldReceiptsRemoved: number;
  unusedWorkflowNodesRemoved: number;
  orphanFilesRemoved: number;
  archivedInboxRemoved: number;
}

export function optimizeBrain(): OptimizeReport {
  const atlas = useAtlasStore.getState();
  const missions = useMissionStore.getState();

  // 1. Drop duplicate memory docs — keep the first by addedAt.
  const seen = new Set<string>();
  const keptDocs = [...atlas.memoryDocs]
    .sort((a, b) => a.addedAt - b.addedAt)
    .filter((d) => {
      const sig = `${d.name}|${d.body.length}`;
      if (seen.has(sig)) return false;
      seen.add(sig);
      return true;
    });
  const duplicateDocsRemoved = atlas.memoryDocs.length - keptDocs.length;
  if (duplicateDocsRemoved > 0) {
    // Re-sort newest first for display continuity.
    keptDocs.sort((a, b) => b.addedAt - a.addedAt);
    useAtlasStore.setState({ memoryDocs: keptDocs });
  }

  // 2. Drop old receipts only when over threshold.
  let oldReceiptsRemoved = 0;
  if (missions.history.length > RECEIPT_PRUNE_THRESHOLD) {
    const cutoff = Date.now() - OLD_RECEIPT_DAYS * 86_400_000;
    const kept = missions.history.filter((r) => r.startedAt >= cutoff);
    oldReceiptsRemoved = missions.history.length - kept.length;
    if (oldReceiptsRemoved > 0) {
      useMissionStore.getState().setHistory(kept);
    }
  }

  // 3. Drop workflow nodes with no run reference in the last N days.
  const cutoff = Date.now() - UNUSED_WORKFLOW_DAYS * 86_400_000;
  const recentRuns = atlas.workflowRuns.filter((r) => r.startedAt >= cutoff);
  const referenced = new Set<string>();
  for (const r of recentRuns) {
    for (const s of r.steps) referenced.add(s.nodeId);
  }
  const keptNodes = atlas.workflowNodes.filter((n) => referenced.has(n.id));
  const removedNodeIds = new Set(
    atlas.workflowNodes.filter((n) => !referenced.has(n.id)).map((n) => n.id)
  );
  const unusedWorkflowNodesRemoved = atlas.workflowNodes.length - keptNodes.length;
  let keptEdges = atlas.workflowEdges;
  if (unusedWorkflowNodesRemoved > 0) {
    keptEdges = atlas.workflowEdges.filter(
      (e) => !removedNodeIds.has(e.from) && !removedNodeIds.has(e.to)
    );
    // Only apply if we have any runs — otherwise canvases stay intact.
    if (recentRuns.length > 0) {
      useAtlasStore.setState({
        workflowNodes: keptNodes,
        workflowEdges: keptEdges
      });
    }
  }

  // 4. Drop orphan files (file metadata with no matching memory doc).
  const docNames = new Set(keptDocs.map((d) => d.name));
  const keptFiles = atlas.files.filter((f) => docNames.has(f.name));
  const orphanFilesRemoved = atlas.files.length - keptFiles.length;
  if (orphanFilesRemoved > 0) {
    useAtlasStore.setState({ files: keptFiles });
  }

  // 5. Drop archived inbox items.
  const keptInbox = atlas.inbox.filter((i) => i.state !== "archived");
  const archivedInboxRemoved = atlas.inbox.length - keptInbox.length;
  if (archivedInboxRemoved > 0) {
    useAtlasStore.setState({ inbox: keptInbox });
  }

  return {
    duplicateDocsRemoved,
    oldReceiptsRemoved,
    unusedWorkflowNodesRemoved:
      recentRuns.length > 0 ? unusedWorkflowNodesRemoved : 0,
    orphanFilesRemoved,
    archivedInboxRemoved
  };
}

// ---------- helpers ----------

function approxLocalStorage(): { bytes: number; keys: number } {
  if (typeof window === "undefined") return { bytes: 0, keys: 0 };
  try {
    let bytes = 0;
    const keys = window.localStorage.length;
    for (let i = 0; i < keys; i++) {
      const k = window.localStorage.key(i);
      if (!k) continue;
      bytes += k.length + (window.localStorage.getItem(k) ?? "").length;
    }
    return { bytes, keys };
  } catch {
    return { bytes: 0, keys: 0 };
  }
}

function duplicateMemoryDocCount(
  docs: ReturnType<typeof useAtlasStore.getState>["memoryDocs"]
): number {
  const seen = new Set<string>();
  let dup = 0;
  for (const d of docs) {
    const sig = `${d.name}|${d.body.length}`;
    if (seen.has(sig)) dup++;
    else seen.add(sig);
  }
  return dup;
}

function oldReceiptCount(history: MissionReceipt[]): number {
  if (history.length <= RECEIPT_PRUNE_THRESHOLD) return 0;
  const cutoff = Date.now() - OLD_RECEIPT_DAYS * 86_400_000;
  return history.filter((r) => r.startedAt < cutoff).length;
}

function staleRepoCount(
  sources: ReturnType<typeof useBrainStore.getState>["memorySources"],
  history: MissionReceipt[]
): number {
  const cutoff = Date.now() - STALE_REPO_DAYS * 86_400_000;
  const referenced = new Set(history.flatMap((m) => (m.repoContext ? [m.repoContext] : [])));
  return sources.filter(
    (s) => s.kind === "github" && !referenced.has(s.label)
  ).length;
}

function unusedWorkflowNodeCount(
  nodes: ReturnType<typeof useAtlasStore.getState>["workflowNodes"],
  runs: ReturnType<typeof useAtlasStore.getState>["workflowRuns"]
): number {
  const cutoff = Date.now() - UNUSED_WORKFLOW_DAYS * 86_400_000;
  const recent = runs.filter((r) => r.startedAt >= cutoff);
  if (recent.length === 0) return 0;
  const referenced = new Set<string>();
  for (const r of recent) for (const s of r.steps) referenced.add(s.nodeId);
  return nodes.filter((n) => !referenced.has(n.id)).length;
}

function orphanFileCount(
  files: ReturnType<typeof useAtlasStore.getState>["files"],
  docs: ReturnType<typeof useAtlasStore.getState>["memoryDocs"]
): number {
  const docNames = new Set(docs.map((d) => d.name));
  return files.filter((f) => !docNames.has(f.name)).length;
}

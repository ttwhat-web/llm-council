/**
 * Brain snapshot · export / import .brainpack
 *
 * A snapshot bundles every persisted slice of the local state into one
 * downloadable JSON file. Restore overwrites the in-memory stores and
 * triggers their `save()` paths so localStorage matches.
 *
 * Networking is never used. The file lands in the user's downloads
 * folder; the user picks it back up via a file input.
 */

import { useBrainStore, type BrainState } from "@/store/brain";
import { useMissionStore, type MissionReceipt } from "@/store/mission";
import { useAtlasStore } from "@/store/atlas";
import { useThemeStore, type ThemeId } from "@/store/theme";

export interface BrainSnapshot {
  format: "promptready-os.brainpack";
  version: 1;
  createdAt: number;
  payload: {
    brain: Partial<BrainState>;
    missions: { history: MissionReceipt[] };
    atlas: unknown;
    theme: { id: ThemeId };
  };
}

export function buildSnapshot(label: string): BrainSnapshot {
  const brain = useBrainStore.getState();
  const missions = useMissionStore.getState();
  const atlas = useAtlasStore.getState();
  const theme = useThemeStore.getState();

  return {
    format: "promptready-os.brainpack",
    version: 1,
    createdAt: Date.now(),
    payload: {
      brain: {
        bootstrapped: brain.bootstrapped,
        demo: brain.demo,
        identity: brain.identity,
        memorySources: brain.memorySources,
        engines: brain.engines,
        vaultCount: brain.vaultCount,
        missionCount: brain.missionCount,
        knowledgePacks: brain.knowledgePacks,
        lastActivity: brain.lastActivity
      },
      missions: { history: missions.history },
      atlas: atlas.exportAll(),
      theme: { id: theme.id }
    }
  };
}

export function snapshotSize(s: BrainSnapshot): number {
  try {
    return new TextEncoder().encode(JSON.stringify(s)).byteLength;
  } catch {
    return 0;
  }
}

export function downloadSnapshot(label: string): { size: number; filename: string } {
  const snap = buildSnapshot(label);
  const blob = new Blob([JSON.stringify(snap, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const filename = `${slug(label)}-${stamp(snap.createdAt)}.brainpack`;
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  const size = snapshotSize(snap);
  // Keep the whole snapshot in memory for Time Machine restore.
  useAtlasStore.getState().recordSnapshot({ label, size }, snap);
  return { size, filename };
}

/** In-app restore from a snapshot kept in the recent payloads list. */
export function restoreSnapshotById(id: string): boolean {
  const found = useAtlasStore
    .getState()
    .recentSnapshotPayloads.find((p) => p.id === id);
  if (!found) return false;
  const snap = found.payload as BrainSnapshot;
  if (!snap || snap.format !== "promptready-os.brainpack") return false;
  if (snap.payload.brain) {
    useBrainStore.setState((cur) => ({ ...cur, ...snap.payload.brain }));
  }
  if (snap.payload.missions?.history) {
    useMissionStore.getState().setHistory(snap.payload.missions.history);
  }
  if (snap.payload.atlas) {
    useAtlasStore.getState().importAll(snap.payload.atlas);
  }
  if (snap.payload.theme?.id) {
    useThemeStore.getState().set(snap.payload.theme.id);
  }
  return true;
}

export async function restoreSnapshotFromFile(file: File): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text) as BrainSnapshot;
    if (parsed.format !== "promptready-os.brainpack") {
      return { ok: false, error: "Not a brainpack file." };
    }
    if (parsed.version !== 1) {
      return { ok: false, error: `Unsupported brainpack version: ${parsed.version}` };
    }
    // Apply slice by slice. Each store handles persistence.
    if (parsed.payload.brain) {
      const b = parsed.payload.brain;
      // Manual merge avoids cross-cutting concerns inside brain.
      useBrainStore.setState((cur) => ({ ...cur, ...b }));
    }
    if (parsed.payload.missions?.history) {
      useMissionStore.getState().setHistory(parsed.payload.missions.history);
    }
    if (parsed.payload.atlas) {
      useAtlasStore.getState().importAll(parsed.payload.atlas);
    }
    if (parsed.payload.theme?.id) {
      useThemeStore.getState().set(parsed.payload.theme.id);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "brain";
}
function stamp(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

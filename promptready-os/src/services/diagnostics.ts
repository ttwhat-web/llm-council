/**
 * Diagnostics export · Phase 16.
 *
 * Generates a `diagnostics.md` from real local state for support /
 * migration / debug. Nothing leaves the machine.
 */

import { useBrainStore } from "@/store/brain";
import { useMissionStore } from "@/store/mission";
import { useAtlasStore } from "@/store/atlas";
import { useThemeStore } from "@/store/theme";

export function buildDiagnosticsMarkdown(): string {
  const brain = useBrainStore.getState();
  const missions = useMissionStore.getState();
  const atlas = useAtlasStore.getState();
  const theme = useThemeStore.getState();

  const lines: string[] = [];
  lines.push(`# PromptReady OS · Diagnostics`);
  lines.push("");
  lines.push(`*Generated ${new Date().toISOString()}*`);
  lines.push("");

  lines.push(`## Runtime`);
  lines.push(`- app: PromptReady OS`);
  lines.push(`- version: 0.1.0`);
  lines.push(`- channel: dev`);
  lines.push(`- platform: ${typeof navigator === "undefined" ? "unknown" : navigator.platform}`);
  lines.push(`- userAgent: ${typeof navigator === "undefined" ? "unknown" : navigator.userAgent}`);
  lines.push(`- theme: ${theme.id}`);
  lines.push("");

  lines.push(`## Storage`);
  const storageUsage = estimateLocalStorage();
  lines.push(`- localStorage keys: ${storageUsage.keys}`);
  lines.push(`- approx bytes: ${storageUsage.bytes}`);
  lines.push("");

  lines.push(`## Brain`);
  if (brain.identity) {
    lines.push(`- name: ${brain.identity.name}`);
    lines.push(`- mode: ${brain.identity.mode}`);
    lines.push(`- created: ${new Date(brain.identity.createdAt).toISOString()}`);
  } else {
    lines.push(`- *no brain bootstrapped*`);
  }
  lines.push(`- engines: ${brain.engines.map((e) => e.kind).join(" · ") || "none"}`);
  lines.push(`- sources: ${brain.memorySources.length}`);
  lines.push(`- missions counter: ${brain.missionCount}`);
  lines.push(`- demo data: ${brain.demo ? "yes" : "no"}`);
  lines.push("");

  lines.push(`## Missions`);
  lines.push(`- receipts archived: ${missions.history.length}`);
  lines.push(`- runtime: ${missions.runtime}`);
  if (missions.current) {
    lines.push(`- current: \`${missions.current.id}\` · stage ${missions.current.stage}`);
  }
  const engines = countBy(missions.history, (m) => m.engine ?? "deterministic");
  for (const [k, v] of Object.entries(engines)) {
    lines.push(`- engine usage · ${k}: ${v}`);
  }
  lines.push("");

  lines.push(`## Atlas`);
  lines.push(`- inbox items: ${atlas.inbox.length}`);
  lines.push(`- memory docs imported: ${atlas.memoryDocs.length}`);
  lines.push(`- files (metadata): ${atlas.files.length}`);
  lines.push(`- workflow nodes: ${atlas.workflowNodes.length}`);
  lines.push(`- workflow edges: ${atlas.workflowEdges.length}`);
  lines.push(`- workflow runs recorded: ${atlas.workflowRuns.length}`);
  lines.push(`- pinned deliverables: ${atlas.pinnedDeliverables.length}`);
  lines.push(`- snapshots recorded: ${atlas.snapshots.length}`);
  lines.push(`- pairing code: ${atlas.pairingCode ? "issued" : "none"}`);
  lines.push(`- telegram link: ${atlas.telegram ? "issued" : "none"}`);
  lines.push("");

  lines.push(`## Recent receipts (last 5)`);
  for (const m of missions.history.slice(0, 5)) {
    lines.push(
      `- \`${m.id}\` · ${new Date(m.startedAt).toISOString()} · mode=${m.mode} · stage=${m.stage}${m.engine ? ` · engine=${m.engine}` : ""}${m.score ? ` · score=${m.score}/100` : ""}`
    );
  }
  lines.push("");

  lines.push(`## Recent workflow runs (last 3)`);
  for (const r of atlas.workflowRuns.slice(0, 3)) {
    lines.push(`- \`${r.id}\` · ${new Date(r.startedAt).toISOString()} · ${r.status} · ${r.steps.length} step(s)`);
    for (const s of r.steps) {
      lines.push(`  - [${s.state}] ${s.kind} · ${s.message}`);
    }
  }
  lines.push("");

  lines.push(`---`);
  lines.push(`*Everything above is local-only.*`);
  return lines.join("\n");
}

export function downloadDiagnostics(): string {
  const md = buildDiagnosticsMarkdown();
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  const filename = `promptready-os-diagnostics-${stamp}.md`;
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}

function estimateLocalStorage(): { keys: number; bytes: number } {
  if (typeof window === "undefined") return { keys: 0, bytes: 0 };
  try {
    let bytes = 0;
    const keys = window.localStorage.length;
    for (let i = 0; i < keys; i++) {
      const k = window.localStorage.key(i);
      if (!k) continue;
      const v = window.localStorage.getItem(k) ?? "";
      bytes += k.length + v.length;
    }
    return { keys, bytes };
  } catch {
    return { keys: 0, bytes: 0 };
  }
}

function countBy<T>(arr: T[], pick: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of arr) {
    const k = pick(v);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

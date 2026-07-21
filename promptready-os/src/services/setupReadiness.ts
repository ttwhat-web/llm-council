/**
 * Setup readiness · Phase 19.
 *
 * Real probes against the local state. Every check returns one of:
 *
 *   ok      · all expectations met
 *   partial · some expectations met, not all
 *   blocked · the operator must do something
 *   unknown · we can't probe from the browser; ships with the desktop
 *
 * The overall score is a weighted average of ok / partial / blocked.
 * Unknown checks don't lower the score.
 */

import { useBrainStore } from "@/store/brain";
import { useMissionStore } from "@/store/mission";
import { useAtlasStore } from "@/store/atlas";
import { probeOllama } from "@/services/missionRunner";

export type CheckState = "ok" | "partial" | "blocked" | "unknown";

export type CheckActionKind =
  | "create-demo-brain"
  | "run-test-mission"
  | "export-diagnostics"
  | "create-snapshot"
  | "copy-ollama-pull"
  | "open-settings"
  | "generate-telegram-code"
  | "open-bootstrap";

export interface CheckAction {
  kind: CheckActionKind;
  label: string;
  /** Optional payload — e.g. a model name for copy-ollama-pull. */
  payload?: string;
}

export interface CheckResult {
  id: string;
  label: string;
  state: CheckState;
  detail: string;
  weight: number;
  action?: CheckAction;
}

export interface ReadinessReport {
  results: CheckResult[];
  /** 0–100 weighted score. Unknown checks are excluded. */
  score: number;
  /** overall state: ok / partial / blocked. */
  state: CheckState;
}

const SUGGESTED_FIRST_MODEL = "gemma2:2b";

export async function runReadinessChecks(): Promise<ReadinessReport> {
  const results: CheckResult[] = [];
  results.push(checkRuntime());
  results.push(checkStorage());
  results.push(checkBrain());
  results.push(checkDeterministic());
  const ollamaProbe = await probeOllama();
  results.push(checkOllamaReachable(ollamaProbe));
  results.push(checkOllamaModels(ollamaProbe));
  results.push(checkWorkspaceSize());
  results.push(checkSnapshot());
  results.push(checkTelegram());
  results.push(checkDiagnostics());

  const totalWeight = results
    .filter((r) => r.state !== "unknown")
    .reduce((acc, r) => acc + r.weight, 0);
  const earned = results
    .filter((r) => r.state !== "unknown")
    .reduce((acc, r) => {
      if (r.state === "ok") return acc + r.weight;
      if (r.state === "partial") return acc + r.weight * 0.5;
      return acc;
    }, 0);
  const score = totalWeight > 0 ? Math.round((earned / totalWeight) * 100) : 0;

  const anyBlocked = results.some((r) => r.state === "blocked");
  const anyPartial = results.some((r) => r.state === "partial");
  const state: CheckState = anyBlocked ? "blocked" : anyPartial ? "partial" : "ok";

  return { results, score, state };
}

// ============================================================================
// Individual checks
// ============================================================================

function checkRuntime(): CheckResult {
  if (typeof window === "undefined") {
    return {
      id: "runtime",
      label: "Runtime",
      state: "blocked",
      detail: "No browser window detected.",
      weight: 5
    };
  }
  const isTauri =
    typeof (window as unknown as { __TAURI_IPC__?: unknown }).__TAURI_IPC__ !== "undefined";
  if (isTauri) {
    return {
      id: "runtime",
      label: "Desktop runtime",
      state: "ok",
      detail: "Tauri shell detected · full desktop runtime",
      weight: 5
    };
  }
  return {
    id: "runtime",
    label: "Runtime",
    state: "partial",
    detail: "Browser preview · download Operator Core desktop for the full runtime",
    weight: 5
  };
}

function checkStorage(): CheckResult {
  if (typeof window === "undefined") {
    return { id: "storage", label: "Local storage", state: "blocked", detail: "no window", weight: 5 };
  }
  try {
    const key = "__pr_probe";
    window.localStorage.setItem(key, "1");
    window.localStorage.removeItem(key);
    return {
      id: "storage",
      label: "Local storage",
      state: "ok",
      detail: "localStorage writable",
      weight: 5
    };
  } catch {
    return {
      id: "storage",
      label: "Local storage",
      state: "blocked",
      detail: "localStorage not writable · private window?",
      weight: 5
    };
  }
}

function checkBrain(): CheckResult {
  const b = useBrainStore.getState();
  if (b.identity) {
    return {
      id: "brain",
      label: "Brain",
      state: "ok",
      detail: `${b.identity.name} · ${b.identity.mode}${b.demo ? " · demo" : ""}`,
      weight: 10
    };
  }
  return {
    id: "brain",
    label: "Brain",
    state: "blocked",
    detail: "No brain bootstrapped. Open the welcome flow or try the demo.",
    weight: 10,
    action: { kind: "open-bootstrap", label: "Open bootstrap" }
  };
}

function checkDeterministic(): CheckResult {
  return {
    id: "deterministic",
    label: "Deterministic engine",
    state: "ok",
    detail: "Local rules engine · always available · no network",
    weight: 5
  };
}

function checkOllamaReachable(probe: Awaited<ReturnType<typeof probeOllama>>): CheckResult {
  if (probe.reachable) {
    return {
      id: "ollama-reachable",
      label: "Ollama",
      state: "ok",
      detail: `reachable · v${probe.version ?? "?"}`,
      weight: 8
    };
  }
  return {
    id: "ollama-reachable",
    label: "Ollama",
    state: "partial",
    detail:
      "not reachable on localhost:11434 · optional (deterministic engine runs without it)",
    weight: 8,
    action: { kind: "copy-ollama-pull", label: "Copy install hint", payload: "curl -fsSL https://ollama.com/install.sh | sh" }
  };
}

function checkOllamaModels(probe: Awaited<ReturnType<typeof probeOllama>>): CheckResult {
  if (!probe.reachable) {
    return {
      id: "ollama-models",
      label: "Ollama models",
      state: "unknown",
      detail: "Ollama not reachable · skipped",
      weight: 6
    };
  }
  if (probe.models.length === 0) {
    return {
      id: "ollama-models",
      label: "Ollama models",
      state: "blocked",
      detail: `no models installed · pull ${SUGGESTED_FIRST_MODEL} to start`,
      weight: 6,
      action: {
        kind: "copy-ollama-pull",
        label: `Copy: ollama pull ${SUGGESTED_FIRST_MODEL}`,
        payload: `ollama pull ${SUGGESTED_FIRST_MODEL}`
      }
    };
  }
  return {
    id: "ollama-models",
    label: "Ollama models",
    state: "ok",
    detail: `${probe.models.length} model${probe.models.length === 1 ? "" : "s"} installed`,
    weight: 6
  };
}

function checkWorkspaceSize(): CheckResult {
  if (typeof window === "undefined") {
    return { id: "workspace-size", label: "Workspace size", state: "unknown", detail: "no window", weight: 3 };
  }
  try {
    let bytes = 0;
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k) continue;
      bytes += k.length + (window.localStorage.getItem(k) ?? "").length;
    }
    const kb = bytes / 1024;
    return {
      id: "workspace-size",
      label: "Workspace size",
      state: kb < 4500 ? "ok" : "partial",
      detail: `~${kb.toFixed(1)} KB · ${kb < 4500 ? "comfortable" : "approaching browser quota"}`,
      weight: 3
    };
  } catch {
    return {
      id: "workspace-size",
      label: "Workspace size",
      state: "unknown",
      detail: "size probe failed",
      weight: 3
    };
  }
}

function checkSnapshot(): CheckResult {
  const snaps = useAtlasStore.getState().snapshots;
  if (snaps.length === 0) {
    return {
      id: "snapshot",
      label: "Backup",
      state: "blocked",
      detail: "No snapshot exported yet · export one to enable Time Machine.",
      weight: 8,
      action: { kind: "create-snapshot", label: "Create snapshot" }
    };
  }
  return {
    id: "snapshot",
    label: "Backup",
    state: "ok",
    detail: `${snaps.length} snapshot${snaps.length === 1 ? "" : "s"} on record · latest ${new Date(snaps[0].createdAt).toLocaleString()}`,
    weight: 8
  };
}

function checkTelegram(): CheckResult {
  const link = useAtlasStore.getState().telegram;
  if (!link) {
    return {
      id: "telegram",
      label: "Telegram bridge",
      state: "partial",
      detail: "No link code · optional · generate one to pair when the bot ships",
      weight: 4,
      action: { kind: "generate-telegram-code", label: "Generate link code" }
    };
  }
  return {
    id: "telegram",
    label: "Telegram bridge",
    state: "ok",
    detail: `link code issued · networking ships with desktop runtime`,
    weight: 4
  };
}

function checkDiagnostics(): CheckResult {
  const history = useMissionStore.getState().history;
  if (history.length === 0) {
    return {
      id: "diagnostics",
      label: "Test mission",
      state: "blocked",
      detail: "No missions dispatched yet · run one to prove the engine works.",
      weight: 8,
      action: { kind: "run-test-mission", label: "Run test mission" }
    };
  }
  return {
    id: "diagnostics",
    label: "Test mission",
    state: "ok",
    detail: `${history.length} mission${history.length === 1 ? "" : "s"} archived · last engine: ${history[0].engine ?? "deterministic"}`,
    weight: 8
  };
}

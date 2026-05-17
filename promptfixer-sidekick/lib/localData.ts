/**
 * Local-data export / import / clear.
 *
 * Bundles every `pf.*` localStorage key into a portable JSON document
 * (and back). Used by Settings → "Local data" to give operators full
 * ownership over what their browser holds.
 *
 * Keys exported (curated allow-list — anything else is ignored):
 *
 *   pf.receipts.v1            Mission Receipt archive
 *   pf.history.v1             Legacy history drawer
 *   pf.stacks.v1              Saved Prompt Stacks
 *   pf.drafts.v1              Library drafts (saved exports)
 *   pf.recorder.v1.state      Workflow recorder live state
 *   pf.recorder.v1.drafts     Workflow recorder saved tapes
 *   pf.memory.notes.v1        Manual memory notes
 *   pf.terminal.watchlist.v1  Terminal watchlist symbols
 *   pf.onboarding.v1.completed
 *   pf.billing.v1.tier        Local Pro-Preview flag
 *   pf.billing.v1.usage       Local-only daily counter
 *   promptfixer.settings.v6   Mission Control settings
 *   promptfixer.history.v1    Legacy history (pre-v1 rename)
 */

"use client";

const EXPORTABLE_KEYS: ReadonlyArray<string> = [
  "pf.receipts.v1",
  "pf.history.v1",
  "pf.stacks.v1",
  "pf.drafts.v1",
  "pf.recorder.v1.state",
  "pf.recorder.v1.drafts",
  "pf.memory.notes.v1",
  "pf.terminal.watchlist.v1",
  "pf.onboarding.v1.completed",
  "pf.billing.v1.tier",
  "pf.billing.v1.usage",
  "promptfixer.settings.v6",
  "promptfixer.history.v1"
];

export interface LocalDataBundle {
  version: 1;
  exportedAt: string;
  origin: string;
  entries: Record<string, string>;
}

export function buildLocalDataBundle(): LocalDataBundle {
  const entries: Record<string, string> = {};
  if (typeof window === "undefined") {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      origin: "",
      entries
    };
  }
  for (const key of EXPORTABLE_KEYS) {
    try {
      const value = window.localStorage.getItem(key);
      if (value !== null) entries[key] = value;
    } catch {
      /* ignore */
    }
  }
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    origin: window.location.origin,
    entries
  };
}

export function downloadLocalDataBundle(): void {
  if (typeof window === "undefined") return;
  const bundle = buildLocalDataBundle();
  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 10);
  const a = document.createElement("a");
  a.href = url;
  a.download = `operator-center-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface ImportResult {
  ok: boolean;
  restored: string[];
  skipped: string[];
  error?: string;
}

export function importLocalDataBundle(text: string): ImportResult {
  if (typeof window === "undefined") {
    return { ok: false, restored: [], skipped: [], error: "window_undefined" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, restored: [], skipped: [], error: "invalid_json" };
  }
  const bundle = parsed as Partial<LocalDataBundle>;
  if (!bundle || typeof bundle !== "object" || bundle.version !== 1 || !bundle.entries) {
    return { ok: false, restored: [], skipped: [], error: "not_a_bundle" };
  }
  const restored: string[] = [];
  const skipped: string[] = [];
  for (const [key, value] of Object.entries(bundle.entries)) {
    if (!EXPORTABLE_KEYS.includes(key)) {
      skipped.push(key);
      continue;
    }
    if (typeof value !== "string") {
      skipped.push(key);
      continue;
    }
    try {
      window.localStorage.setItem(key, value);
      restored.push(key);
    } catch {
      skipped.push(key);
    }
  }
  return { ok: true, restored, skipped };
}

export function clearAllLocalData(): { cleared: string[] } {
  if (typeof window === "undefined") return { cleared: [] };
  const cleared: string[] = [];
  for (const key of EXPORTABLE_KEYS) {
    try {
      if (window.localStorage.getItem(key) !== null) {
        window.localStorage.removeItem(key);
        cleared.push(key);
      }
    } catch {
      /* ignore */
    }
  }
  return { cleared };
}

export function listManagedKeys(): readonly string[] {
  return EXPORTABLE_KEYS;
}

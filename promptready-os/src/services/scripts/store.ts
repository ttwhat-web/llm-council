/**
 * Script Lab · local-only script persistence.
 *
 * Scripts live in localStorage under `promptready-os.scripts.v1`. No
 * remote execution, no cloud sync, no telemetry. Empty store on first
 * load is seeded with the three examples below so the operator has
 * something to run immediately.
 */

const KEY = "promptready-os.scripts.v1";
const ACTIVE_KEY = "promptready-os.scripts.active";

export interface SavedScript {
  id: string;
  name: string;
  body: string;
  builtin?: boolean; // true for the seeded examples; can be overwritten
}

export const EXAMPLES: SavedScript[] = [
  {
    id: "sma-cross",
    name: "SMA 20/50 crossover",
    builtin: true,
    body: [
      "// Two moving averages on close.",
      "let fast = sma(close, 20)",
      "let slow = sma(close, 50)",
      "plot(fast, \"SMA 20\")",
      "plot(slow, \"SMA 50\")"
    ].join("\n")
  },
  {
    id: "rsi-14",
    name: "RSI 14",
    builtin: true,
    body: [
      "// 14-period RSI in lower pane with 30 / 70 thresholds.",
      "let r = rsi(close, 14)",
      "plot(r, \"RSI 14\")",
      "hline(70, \"overbought\")",
      "hline(30, \"oversold\")"
    ].join("\n")
  },
  {
    id: "bb-20-2",
    name: "Bollinger Bands 20/2",
    builtin: true,
    body: [
      "// Bollinger Bands · upper, middle (SMA20), lower.",
      "let bands = bb(close, 20, 2)",
      "plot(bands, \"BB 20/2\")"
    ].join("\n")
  }
];

function read(): SavedScript[] {
  if (typeof window === "undefined") return EXAMPLES;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      write(EXAMPLES);
      return EXAMPLES;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EXAMPLES;
    return parsed.filter(
      (s): s is SavedScript =>
        s && typeof s.id === "string" && typeof s.name === "string" && typeof s.body === "string"
    );
  } catch {
    return EXAMPLES;
  }
}

function write(scripts: SavedScript[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(scripts));
  } catch {
    // ignore
  }
}

export function listScripts(): SavedScript[] {
  return read();
}

export function getActiveId(): string {
  if (typeof window === "undefined") return EXAMPLES[0].id;
  try {
    return window.localStorage.getItem(ACTIVE_KEY) ?? EXAMPLES[0].id;
  } catch {
    return EXAMPLES[0].id;
  }
}

export function setActiveId(id: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    // ignore
  }
}

export function upsert(script: SavedScript): SavedScript[] {
  const list = read();
  const next = list.some((s) => s.id === script.id)
    ? list.map((s) => (s.id === script.id ? script : s))
    : [...list, script];
  write(next);
  return next;
}

export function remove(id: string): SavedScript[] {
  const list = read().filter((s) => s.id !== id);
  // Always keep the three builtin examples available; restore if user wiped one.
  const next = [...list];
  for (const ex of EXAMPLES) {
    if (!next.some((s) => s.id === ex.id)) next.unshift(ex);
  }
  write(next);
  return next;
}

export function newId(): string {
  return `s-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

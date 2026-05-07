/**
 * Mission Log — derives a deterministic operations stream from the live
 * pipeline state and a `FixResponse`. Used by the MissionLog component
 * under the PipelineViz.
 *
 * Every entry is anchored in real data — there are no faked telemetry
 * lines. Timestamps are reconstructed from response durations so the
 * stream "scrolls" with the actual pipeline timing.
 */

import type { FixResponse, LogEntry, LogKind } from "./types";

let counter = 0;
function nid(): string {
  counter = (counter + 1) % 1_000_000;
  return `${Date.now().toString(36)}-${counter.toString(36)}`;
}

/**
 * Lightweight entries appended on user actions. Used for the "Submitted N chars"
 * line and any synchronous events that happen before the response lands.
 */
export function logUserSubmit(input: string): LogEntry {
  return {
    id: nid(),
    ts: Date.now(),
    kind: "info",
    tag: "input",
    message: `Submitted ${input.trim().length} chars`
  };
}

export function logTemplate(name: string): LogEntry {
  return {
    id: nid(),
    ts: Date.now(),
    kind: "info",
    tag: "template",
    message: `Loaded template — ${name}`
  };
}

export function logCommand(command: string): LogEntry {
  return {
    id: nid(),
    ts: Date.now(),
    kind: "info",
    tag: "cmd",
    message: command
  };
}

/**
 * Derive entries from the response payload. Returns newest-first.
 */
export function logsFromResponse(
  result: FixResponse,
  opts: { autoMode: boolean; startedAt: number; cleanedRemoved?: string[] } = {
    autoMode: false,
    startedAt: Date.now()
  }
): LogEntry[] {
  const { autoMode, startedAt, cleanedRemoved } = opts;
  const entries: LogEntry[] = [];
  let cursor = startedAt;

  // Cleaner — synthetic small step.
  if (cleanedRemoved && cleanedRemoved.length > 0) {
    cursor += 4;
    entries.push(make(cursor, "ok", "cleaner", `Stripped ${cleanedRemoved.join(", ")}`));
  } else {
    cursor += 2;
    entries.push(make(cursor, "ok", "cleaner", "Input clean"));
  }

  // Mode detection
  if (autoMode && result.detectedMode) {
    cursor += 6;
    entries.push(make(cursor, "info", "mode", `Detected mode → ${result.detectedMode}`));
  }

  // Routing
  cursor += 8;
  if (result.supervisor.fallbackUsed) {
    entries.push(
      make(
        cursor,
        "warn",
        "router",
        `Fallback ${result.supervisor.requestedEngine} → ${result.supervisor.resolved}`
      )
    );
  } else {
    entries.push(make(cursor, "ok", "router", `Routing → ${result.supervisor.resolved}`));
  }

  // Supervisor
  if (result.supervisor.used && result.supervisor.model) {
    cursor += result.supervisor.latencyMs ?? 80;
    entries.push(
      make(
        cursor,
        "ok",
        "supervisor",
        `Audit complete · ${result.supervisor.model} · ${result.supervisor.latencyMs ?? "?"}ms`
      )
    );
  } else if (result.supervisor.error) {
    cursor += 40;
    entries.push(make(cursor, "warn", "supervisor", `Audit skipped — ${result.supervisor.error}`));
  } else {
    cursor += 4;
    entries.push(make(cursor, "info", "supervisor", "Audit skipped (deterministic)"));
  }

  // Safety
  cursor += 6;
  if (result.safety.blocked) {
    entries.push(make(cursor, "err", "safety", "Blocked — critical command detected"));
  } else if (result.safety.findings.length > 0) {
    entries.push(
      make(
        cursor,
        "warn",
        "safety",
        `${result.safety.findings.length} risk${result.safety.findings.length === 1 ? "" : "s"} flagged`
      )
    );
  } else {
    entries.push(make(cursor, "ok", "safety", "Safety review passed"));
  }

  // Score (always)
  cursor += 4;
  entries.push(
    make(
      cursor,
      "info",
      "score",
      `Score · clarity ${result.score.clarity} · spec ${result.score.specificity} · fit ${result.score.modelFit}`
    )
  );

  // Output (terminal complete event)
  cursor = startedAt + result.elapsedMs;
  entries.push(
    make(cursor, "ok", "output", `Prompt ready · ${result.elapsedMs}ms · mode ${result.mode}`)
  );

  return entries.reverse();
}

export function makeLogEntry(kind: LogKind, message: string, tag?: string): LogEntry {
  return { id: nid(), ts: Date.now(), kind, message, tag };
}

function make(ts: number, kind: LogKind, tag: string, message: string): LogEntry {
  return { id: nid(), ts, kind, tag, message };
}

export function appendLog(
  prev: LogEntry[],
  next: LogEntry | LogEntry[],
  cap = 40
): LogEntry[] {
  const incoming = Array.isArray(next) ? next : [next];
  const merged = [...incoming, ...prev];
  return merged.slice(0, cap);
}

export function formatLogTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

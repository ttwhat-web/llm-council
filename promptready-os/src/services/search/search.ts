/**
 * Company Knowledge Search · one search, real sources only.
 *
 * Plain case-insensitive substring matching over data that already
 * exists — Gmail messages, calendar events, the Action Queue's real
 * timeline, and the founder's memory notes. No embeddings, no
 * "semantic understanding" claimed that hasn't actually been built —
 * an honest keyword search beats a fake "AI search" that can't be
 * verified. Capped per source so one noisy inbox can't drown out
 * everything else.
 */

import type { CalendarEvent, GmailMessage } from "@/services/google/types";
import type { TimelineEntry } from "@/services/executors/timeline";
import type { FounderMemory } from "@/services/operator/memorySeed";

export type SearchResultSource = "email" | "calendar" | "timeline" | "memory";

export interface SearchResult {
  source: SearchResultSource;
  id: string;
  label: string;
  detail?: string;
  /** Unix ms when available, for recency ordering within a source. */
  at?: number;
}

const MAX_PER_SOURCE = 5;

function matches(query: string, ...fields: string[]): boolean {
  return fields.some((f) => f.toLowerCase().includes(query));
}

export function searchWorkspace(
  rawQuery: string,
  input: {
    messages?: GmailMessage[];
    events?: CalendarEvent[];
    timeline?: TimelineEntry[];
    memory?: FounderMemory | null;
  }
): SearchResult[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];

  const results: SearchResult[] = [];

  for (const m of input.messages ?? []) {
    if (!matches(query, m.subject, m.fromName, m.fromAddress, m.snippet)) continue;
    results.push({
      source: "email",
      id: m.id,
      label: m.subject || "(no subject)",
      detail: m.fromName || m.fromAddress,
      at: m.date
    });
    if (results.filter((r) => r.source === "email").length >= MAX_PER_SOURCE) break;
  }

  for (const e of input.events ?? []) {
    if (!matches(query, e.summary, e.location)) continue;
    results.push({
      source: "calendar",
      id: e.id,
      label: e.summary || "(no title)",
      detail: new Date(e.startMs).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }),
      at: e.startMs
    });
    if (results.filter((r) => r.source === "calendar").length >= MAX_PER_SOURCE) break;
  }

  for (const t of input.timeline ?? []) {
    if (!matches(query, t.label, t.evidence ?? "")) continue;
    results.push({ source: "timeline", id: `${t.actionId}-${t.event}-${t.at}`, label: t.label, detail: t.evidence, at: t.at });
    if (results.filter((r) => r.source === "timeline").length >= MAX_PER_SOURCE) break;
  }

  const memoryLines = [
    ...(input.memory?.rememberThese?.split("\n") ?? []),
    ...(input.memory?.avoidThese?.split("\n") ?? [])
  ].filter((l) => l.trim());
  for (const line of memoryLines) {
    if (!matches(query, line)) continue;
    results.push({ source: "memory", id: line, label: line });
    if (results.filter((r) => r.source === "memory").length >= MAX_PER_SOURCE) break;
  }

  return results;
}

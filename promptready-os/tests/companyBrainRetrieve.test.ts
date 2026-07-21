import { describe, expect, it } from "vitest";
import { getCompanyBrainResult, isResolvedBrainResult, renderCompanyBrainForPrompt } from "@/services/companyBrain/retrieve";
import { EMPTY_MEMORY } from "@/services/operator/memorySeed";
import type { FounderMemory } from "@/services/operator/memorySeed";
import type { CompanyBrainContext } from "@/services/companyBrain/types";
import type { MemoryCandidate } from "@/store/memoryCandidates";
import type { Action, ActionLogEntry } from "@/services/executors/types";
import type { CalendarEvent, GmailMessage, WorkspaceSnapshot } from "@/services/google/types";

const NOW = Date.UTC(2026, 5, 16, 8, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

function msg(p: Partial<GmailMessage> & { id: string; date: number }): GmailMessage {
  return {
    id: p.id,
    threadId: p.threadId ?? `t-${p.id}`,
    date: p.date,
    fromName: p.fromName ?? "Hans Müller",
    fromAddress: (p.fromAddress ?? "hans@acme.de").toLowerCase(),
    toAddresses: p.toAddresses ?? ["me@operator.center"],
    subject: p.subject ?? "Tour package",
    snippet: p.snippet ?? "",
    isFromMe: p.isFromMe ?? false,
    isInInbox: p.isInInbox ?? true,
    isUnread: p.isUnread ?? false,
    labels: p.labels ?? []
  };
}

function event(p: Partial<CalendarEvent> & { id: string; startMs: number; endMs: number }): CalendarEvent {
  return {
    id: p.id,
    calendarId: p.calendarId ?? "primary",
    summary: p.summary ?? "Meeting",
    description: p.description ?? "",
    startMs: p.startMs,
    endMs: p.endMs,
    isAllDay: p.isAllDay ?? false,
    location: p.location ?? "",
    attendees: p.attendees ?? [],
    conferenceUrl: p.conferenceUrl
  };
}

function snap(overrides: Partial<WorkspaceSnapshot> = {}): WorkspaceSnapshot {
  return { syncedAt: NOW, selfEmail: "me@operator.center", messages: [], threads: [], events: [], contacts: [], ...overrides };
}

function action(overrides: Partial<Action> & { id: string; status: Action["status"] }): Action {
  return { executor: "gmail.send", params: {}, title: "Reply to Hans Müller", createdAt: NOW - DAY, ...overrides };
}

function logEntry(p: Partial<ActionLogEntry> & { at: number; actionId: string; event: ActionLogEntry["event"] }): ActionLogEntry {
  return { executor: "gmail.send", ...p };
}

function candidate(overrides: Partial<MemoryCandidate> & { key: string; text: string }): MemoryCandidate {
  return {
    kind: "language",
    subjectLabel: "Hans Müller",
    status: "saved",
    evidenceCount: 2,
    firstSeenAt: NOW - 10 * DAY,
    updatedAt: NOW - 10 * DAY,
    ...overrides
  };
}

function ctx(overrides: Partial<CompanyBrainContext> = {}): CompanyBrainContext {
  return {
    snapshot: snap(),
    actionItems: {},
    actionLog: [],
    memory: { ...EMPTY_MEMORY },
    candidates: {},
    noteOverrides: {},
    feedbackEvents: [],
    now: NOW,
    ...overrides
  };
}

function resolved(query: string, c: CompanyBrainContext) {
  const r = getCompanyBrainResult(query, c);
  if (!isResolvedBrainResult(r)) throw new Error(`expected a resolved result, got ${JSON.stringify(r)}`);
  return r;
}

describe("getCompanyBrainResult · Gmail + Calendar merge", () => {
  it("picks the most recent message as last contact and counts real email history", () => {
    const c = ctx({
      snapshot: snap({
        messages: [
          msg({ id: "m1", date: NOW - 6 * DAY, subject: "Tour package" }),
          msg({ id: "m2", date: NOW - 1 * DAY, subject: "Following up" })
        ]
      })
    });
    const r = resolved("Hans", c);
    expect(r.lastContact?.text).toContain("Following up");
    expect(r.who).toContain("2 emails");
  });
});

describe("getCompanyBrainResult · memory + Timeline merge", () => {
  it("surfaces an active memory note and a real completed Timeline receipt together", () => {
    const c = ctx({
      snapshot: snap({ messages: [msg({ id: "m1", date: NOW - 2 * DAY })] }),
      memory: { ...EMPTY_MEMORY, rememberThese: "Hans Müller prefers German." },
      candidates: { k1: candidate({ key: "k1", text: "Hans Müller prefers German." }) },
      actionItems: {
        "gmail.send:hans@acme.de": action({
          id: "gmail.send:hans@acme.de",
          status: "completed",
          title: "Reply to Hans Müller",
          receipt: "Sent to hans@acme.de.",
          completedAt: NOW - DAY
        })
      },
      actionLog: [logEntry({ at: NOW - DAY, actionId: "gmail.send:hans@acme.de", event: "completed" })]
    });
    const r = resolved("Hans", c);
    expect(r.memory.map((f) => f.text)).toContain("Hans Müller prefers German.");
    expect(r.recentDecisions.map((f) => f.text)).toContain("Sent to hans@acme.de.");
  });
});

describe("getCompanyBrainResult · duplicate suppression", () => {
  it("never lists the exact same fact twice within a section", () => {
    const c = ctx({
      snapshot: snap({ messages: [msg({ id: "m1", date: NOW - 2 * DAY })] }),
      memory: { ...EMPTY_MEMORY, rememberThese: "Always CC the ops team." },
      candidates: {
        k1: candidate({ key: "k1", text: "Always CC the ops team." })
      }
    });
    const r = resolved("Hans", c);
    const texts = r.memory.map((f) => f.text);
    expect(texts).toEqual([...new Set(texts)]);
  });
});

describe("getCompanyBrainResult · conflicting facts", () => {
  it("surfaces a remember/avoid contradiction plainly instead of picking one", () => {
    const c = ctx({
      snapshot: snap({ messages: [msg({ id: "m1", date: NOW - 2 * DAY })] }),
      memory: {
        ...EMPTY_MEMORY,
        rememberThese: "Hans Müller prefers German.",
        avoidThese: "Don't mention pricing to Hans Müller."
      },
      candidates: {
        k1: candidate({ key: "k1", text: "Hans Müller prefers German.", kind: "language", subjectLabel: "Hans Müller" }),
        k2: candidate({ key: "k2", text: "Don't mention pricing to Hans Müller.", kind: "avoid", subjectLabel: "Hans Müller" })
      }
    });
    const r = resolved("Hans", c);
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts[0].note).toContain("Hans Müller");
  });
});

describe("getCompanyBrainResult · missing evidence", () => {
  it("says there's nothing real, never invents a summary", () => {
    const c = ctx({
      snapshot: snap({
        events: [
          event({
            id: "e1",
            startMs: NOW + DAY,
            endMs: NOW + DAY + 3600_000,
            attendees: [{ email: "anna@klein.de", displayName: "Anna Klein", isSelf: false }]
          })
        ]
      })
    });
    const r = resolved("Anna", c);
    expect(r.hasEvidence).toBe(false);
    expect(r.recommendation).toBeNull();
    expect(renderCompanyBrainForPrompt(r)).toBe("");
  });
});

describe("getCompanyBrainResult · stale evidence", () => {
  it("flags a long-unreinforced memory note as needing attention, without hiding it from memory", () => {
    const c = ctx({
      snapshot: snap({ messages: [msg({ id: "m1", date: NOW - 2 * DAY })] }),
      memory: { ...EMPTY_MEMORY, rememberThese: "Old fact about Hans." },
      candidates: { k1: candidate({ key: "k1", text: "Old fact about Hans.", updatedAt: NOW - 200 * DAY }) }
    });
    const r = resolved("Hans", c);
    expect(r.memory.map((f) => f.text)).toContain("Old fact about Hans.");
    expect(r.attention.some((f) => f.text.includes("hasn't been reinforced"))).toBe(true);
  });
});

describe("getCompanyBrainResult · context-size limit", () => {
  it("never returns more than the relevant cap per section, even with many real notes", () => {
    const lines = Array.from({ length: 8 }, (_, i) => `Fact number ${i} about Hans.`);
    const candidatesRecord: Record<string, MemoryCandidate> = {};
    lines.forEach((text, i) => {
      candidatesRecord[`k${i}`] = candidate({ key: `k${i}`, text, updatedAt: NOW - i * DAY });
    });
    const c = ctx({
      snapshot: snap({ messages: [msg({ id: "m1", date: NOW - 2 * DAY })] }),
      memory: { ...EMPTY_MEMORY, rememberThese: lines.join("\n") },
      candidates: candidatesRecord
    });
    const r = resolved("Hans", c);
    expect(r.memory.length).toBeLessThanOrEqual(5);
  });
});

describe("renderCompanyBrainForPrompt", () => {
  it("never mentions technical/architectural terms, only business language", () => {
    const c = ctx({
      snapshot: snap({ messages: [msg({ id: "m1", date: NOW - 2 * DAY })] }),
      memory: { ...EMPTY_MEMORY, rememberThese: "Hans Müller prefers German." },
      candidates: { k1: candidate({ key: "k1", text: "Hans Müller prefers German." }) }
    });
    const r = resolved("Hans", c);
    const out = renderCompanyBrainForPrompt(r);
    expect(out).toContain("What you know about Hans Müller");
    for (const bannedWord of ["vector", "embedding", "executor", "store"]) {
      expect(out.toLowerCase()).not.toContain(bannedWord);
    }
  });
});

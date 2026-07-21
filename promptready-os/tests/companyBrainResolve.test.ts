import { describe, expect, it } from "vitest";
import { resolveSubject } from "@/services/companyBrain/resolveSubject";
import type { CalendarEvent, GmailMessage, WorkspaceSnapshot } from "@/services/google/types";

const NOW = Date.UTC(2026, 5, 16, 8, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

function msg(p: Partial<GmailMessage> & { id: string; date: number }): GmailMessage {
  return {
    id: p.id,
    threadId: p.threadId ?? `t-${p.id}`,
    date: p.date,
    fromName: p.fromName ?? "",
    fromAddress: (p.fromAddress ?? "someone@example.com").toLowerCase(),
    toAddresses: p.toAddresses ?? ["me@operator.center"],
    subject: p.subject ?? "",
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

describe("resolveSubject · person resolution", () => {
  it("resolves an exact name match", () => {
    const s = snap({ messages: [msg({ id: "m1", date: NOW, fromName: "Hans Müller", fromAddress: "hans@acme.de" })] });
    expect(resolveSubject("Hans Müller", s)).toEqual({ kind: "resolved", subjectKey: "hans@acme.de", displayName: "Hans Müller" });
  });

  it("resolves a unique partial name match", () => {
    const s = snap({ messages: [msg({ id: "m1", date: NOW, fromName: "Hans Müller", fromAddress: "hans@acme.de" })] });
    expect(resolveSubject("Hans", s)).toEqual({ kind: "resolved", subjectKey: "hans@acme.de", displayName: "Hans Müller" });
  });

  it("resolves by email address", () => {
    const s = snap({ messages: [msg({ id: "m1", date: NOW, fromName: "Hans Müller", fromAddress: "hans@acme.de" })] });
    expect(resolveSubject("hans@acme.de", s)).toEqual({ kind: "resolved", subjectKey: "hans@acme.de", displayName: "Hans Müller" });
  });

  it("returns ambiguous when two people match the same hint", () => {
    const s = snap({
      messages: [
        msg({ id: "m1", date: NOW, fromName: "Hans Müller", fromAddress: "hans.mueller@acme.de" }),
        msg({ id: "m2", date: NOW - DAY, fromName: "Hans Weber", fromAddress: "hans.weber@acme.de" })
      ]
    });
    const r = resolveSubject("Hans", s);
    expect(r.kind).toBe("ambiguous");
    if (r.kind === "ambiguous") expect(r.candidates.sort()).toEqual(["Hans Müller", "Hans Weber"]);
  });

  it("never guesses on an unrelated query — not-found", () => {
    const s = snap({ messages: [msg({ id: "m1", date: NOW, fromName: "Hans Müller", fromAddress: "hans@acme.de" })] });
    expect(resolveSubject("Zorblax", s)).toEqual({ kind: "not-found" });
  });

  it("not-found with no snapshot at all", () => {
    expect(resolveSubject("Hans", null)).toEqual({ kind: "not-found" });
  });

  it("also resolves a person only known from a calendar attendee", () => {
    const s = snap({
      events: [
        event({
          id: "e1",
          startMs: NOW + DAY,
          endMs: NOW + DAY + 3600_000,
          attendees: [{ email: "anna@klein.de", displayName: "Anna Klein", isSelf: false }]
        })
      ]
    });
    expect(resolveSubject("Anna", s)).toEqual({ kind: "resolved", subjectKey: "anna@klein.de", displayName: "Anna Klein" });
  });
});

describe("resolveSubject · company/topic resolution", () => {
  it("resolves a company name mentioned in a single sender's messages to that sender", () => {
    const s = snap({
      messages: [msg({ id: "m1", date: NOW, fromName: "Ops", fromAddress: "ops@bridge.co", subject: "Bridge & Co. proposal" })]
    });
    expect(resolveSubject("Bridge", s)).toEqual({ kind: "resolved", subjectKey: "ops@bridge.co", displayName: "Ops" });
  });

  it("resolves a company name spanning multiple senders to a topic subject", () => {
    const s = snap({
      messages: [
        msg({ id: "m1", date: NOW, fromName: "Alice", fromAddress: "alice@bridge.co", subject: "Bridge onboarding" }),
        msg({ id: "m2", date: NOW - DAY, fromName: "Bob", fromAddress: "bob@bridge.co", subject: "Bridge renewal" })
      ]
    });
    const r = resolveSubject("Bridge", s);
    expect(r).toEqual({ kind: "resolved", subjectKey: "topic:bridge", displayName: "Bridge" });
  });

  it("resolves 'Klein proposal' from the message that actually mentions it", () => {
    const s = snap({
      messages: [msg({ id: "m1", date: NOW, fromName: "Anna Klein", fromAddress: "anna@klein.de", subject: "Klein proposal draft" })]
    });
    expect(resolveSubject("Klein proposal", s)).toEqual({ kind: "resolved", subjectKey: "anna@klein.de", displayName: "Anna Klein" });
  });
});

describe("resolveSubject · meeting-shaped queries", () => {
  it("resolves 'tomorrow's customer meeting' to the external attendee of the soonest matching event", () => {
    const s = snap({
      events: [
        event({
          id: "e1",
          startMs: NOW + DAY + 3600_000,
          endMs: NOW + DAY + 2 * 3600_000,
          summary: "Bridge demo",
          attendees: [{ email: "ops@bridge.co", displayName: "Bridge Ops", isSelf: false }]
        })
      ]
    });
    expect(resolveSubject("tomorrow's customer meeting", s, NOW)).toEqual({
      kind: "resolved",
      subjectKey: "ops@bridge.co",
      displayName: "Bridge Ops"
    });
  });

  it("never invents an attendee for an internal-only meeting", () => {
    const s = snap({
      events: [
        event({
          id: "e1",
          startMs: NOW + DAY + 3600_000,
          endMs: NOW + DAY + 2 * 3600_000,
          summary: "Internal sync",
          attendees: [{ email: "me@operator.center", displayName: "Me", isSelf: true }]
        })
      ]
    });
    expect(resolveSubject("tomorrow's meeting", s, NOW)).toEqual({ kind: "not-found" });
  });
});

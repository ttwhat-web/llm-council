import { describe, expect, it } from "vitest";
import { searchWorkspace } from "@/services/search/search";
import type { GmailMessage, CalendarEvent } from "@/services/google/types";
import type { TimelineEntry } from "@/services/executors/timeline";
import { EMPTY_MEMORY } from "@/services/operator/memorySeed";

function msg(p: Partial<GmailMessage> & { id: string }): GmailMessage {
  return {
    id: p.id,
    threadId: p.id,
    date: 0,
    fromName: "",
    fromAddress: "someone@example.com",
    toAddresses: [],
    subject: "",
    snippet: "",
    isFromMe: false,
    isInInbox: true,
    isUnread: false,
    labels: [],
    ...p
  };
}

function event(p: Partial<CalendarEvent> & { id: string }): CalendarEvent {
  return {
    id: p.id,
    calendarId: "primary",
    summary: "",
    description: "",
    startMs: 0,
    endMs: 0,
    isAllDay: false,
    location: "",
    attendees: [],
    ...p
  };
}

describe("searchWorkspace", () => {
  it("returns nothing for an empty query — never guesses at intent", () => {
    expect(searchWorkspace("", { messages: [msg({ id: "m1", subject: "Bridge proposal" })] })).toEqual([]);
    expect(searchWorkspace("   ", {})).toEqual([]);
  });

  it("matches an email by subject, sender name, or snippet — case-insensitively", () => {
    const messages = [msg({ id: "m1", subject: "Bridge proposal", fromName: "Hans Müller" })];
    expect(searchWorkspace("bridge", { messages })).toHaveLength(1);
    expect(searchWorkspace("HANS", { messages })).toHaveLength(1);
    expect(searchWorkspace("nomatch", { messages })).toHaveLength(0);
  });

  it("matches a calendar event by summary or location", () => {
    const events = [event({ id: "e1", summary: "Bridge demo", location: "Berlin" })];
    expect(searchWorkspace("berlin", { events })).toHaveLength(1);
  });

  it("matches a timeline entry by label or evidence", () => {
    const timeline: TimelineEntry[] = [
      { at: 1, actionId: "a1", executor: "gmail.send", event: "completed", label: "Completed: Reply to Hans", evidence: "Sent to hans@acme.de." }
    ];
    expect(searchWorkspace("hans", { timeline })).toHaveLength(1);
  });

  it("matches founder memory lines (rememberThese/avoidThese)", () => {
    const memory = { ...EMPTY_MEMORY, rememberThese: "Hans Müller prefers German.\nBridge signs slowly." };
    const results = searchWorkspace("german", { memory });
    expect(results).toHaveLength(1);
    expect(results[0].source).toBe("memory");
  });

  it("labels every result with its real source — never blends sources together", () => {
    const messages = [msg({ id: "m1", subject: "Bridge invoice" })];
    const events = [event({ id: "e1", summary: "Bridge demo" })];
    const results = searchWorkspace("bridge", { messages, events });
    expect(results.map((r) => r.source).sort()).toEqual(["calendar", "email"]);
  });

  it("caps results per source so one noisy inbox can't drown out everything else", () => {
    const messages = Array.from({ length: 20 }, (_, i) => msg({ id: `m${i}`, subject: "Bridge follow-up" }));
    expect(searchWorkspace("bridge", { messages })).toHaveLength(5);
  });
});

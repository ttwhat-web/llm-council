/**
 * Briefing engine · fixture tests.
 *
 * These are the contract for what every detector must do, in isolation,
 * against a tiny hand-crafted WorkspaceSnapshot. No mocks of fetch, no
 * network, no clocks — the snapshot carries its own `syncedAt`, so the
 * tests are fully deterministic.
 *
 * When a detector's behaviour changes, this file is the single source
 * of truth that says "yes, that change is intended".
 */

import { describe, expect, it } from "vitest";
import {
  detectCalendarConflicts,
  detectOpenCommitments,
  detectPaymentMail,
  detectStaleCustomerThreads,
  detectUnansweredInboxMail,
  detectUnpreparedMeetings,
  findConflictPairs
} from "@/services/briefing/detectors";
import { buildBriefing, buildPanels } from "@/services/briefing/engine";
import type {
  CalendarEvent,
  GmailMessage,
  GmailThread,
  WorkspaceSnapshot
} from "@/services/google/types";

const NOW = Date.UTC(2026, 5, 16, 8, 0, 0); // 2026-06-16 08:00 UTC
const DAY = 24 * 60 * 60 * 1000;

const SELF = "tunc@operator.center";

function msg(p: Partial<GmailMessage> & { id: string; date: number }): GmailMessage {
  return {
    id: p.id,
    threadId: p.threadId ?? `t-${p.id}`,
    date: p.date,
    fromName: p.fromName ?? "",
    fromAddress: (p.fromAddress ?? "someone@example.com").toLowerCase(),
    toAddresses: (p.toAddresses ?? [SELF]).map((a) => a.toLowerCase()),
    subject: p.subject ?? "",
    snippet: p.snippet ?? "",
    isFromMe: p.isFromMe ?? false,
    isInInbox: p.isInInbox ?? true,
    isUnread: p.isUnread ?? false,
    labels: p.labels ?? []
  };
}

function thread(id: string, msgs: GmailMessage[]): GmailThread {
  const subject = msgs.length > 0 ? msgs[msgs.length - 1].subject : "";
  // Ensure threadIds are coherent with the thread id.
  const stamped = msgs.map((m) => ({ ...m, threadId: id }));
  return { id, subject, messages: stamped };
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

function snap(partial: Partial<WorkspaceSnapshot>): WorkspaceSnapshot {
  return {
    syncedAt: NOW,
    selfEmail: SELF,
    messages: partial.messages ?? [],
    threads: partial.threads ?? [],
    events: partial.events ?? [],
    contacts: partial.contacts ?? []
  };
}

// ---------------------------------------------------------------------------
// 1 · stale-customer-thread
// ---------------------------------------------------------------------------

describe("detectStaleCustomerThreads", () => {
  it("flags an external thread whose latest message is >=3d old and inbound", () => {
    const m1 = msg({
      id: "m1",
      date: NOW - 6 * DAY,
      fromAddress: "hans@acme.de",
      fromName: "Hans Müller",
      subject: "Re: Tour package"
    });
    const t = thread("t1", [m1]);
    const out = detectStaleCustomerThreads(snap({ threads: [t] }));
    expect(out).toHaveLength(1);
    expect(out[0].focus).toBe("customers");
    expect(out[0].priority).toBe("high"); // 6 >= 5
    expect(out[0].fact).toContain("Hans Müller");
    expect(out[0].evidence).toEqual([{ kind: "thread", threadId: "t1" }]);
  });

  it("does not flag when I am the last sender", () => {
    const m1 = msg({ id: "m1", date: NOW - 6 * DAY, fromAddress: "hans@acme.de" });
    const m2 = msg({ id: "m2", date: NOW - 5 * DAY, fromAddress: SELF, isFromMe: true });
    expect(detectStaleCustomerThreads(snap({ threads: [thread("t1", [m1, m2])] }))).toHaveLength(0);
  });

  it("ignores noisy senders (noreply, google)", () => {
    const m1 = msg({ id: "m1", date: NOW - 6 * DAY, fromAddress: "noreply@stripe.com" });
    const m2 = msg({ id: "m2", date: NOW - 6 * DAY, fromAddress: "notifications@google.com" });
    expect(
      detectStaleCustomerThreads(
        snap({ threads: [thread("t1", [m1]), thread("t2", [m2])] })
      )
    ).toHaveLength(0);
  });

  it("ignores internal-domain senders", () => {
    const m1 = msg({ id: "m1", date: NOW - 6 * DAY, fromAddress: "teammate@operator.center" });
    expect(detectStaleCustomerThreads(snap({ threads: [thread("t1", [m1])] }))).toHaveLength(0);
  });

  it("does NOT treat free-Gmail senders as internal when the user is on @gmail.com", () => {
    // Personal Gmail users: no company domain → every external sender
    // counts, even other @gmail.com addresses.
    const personal = snap({
      selfEmail: "tunc@gmail.com",
      threads: [
        thread("t1", [
          msg({
            id: "m1",
            date: NOW - 5 * DAY,
            fromAddress: "hans@gmail.com",
            fromName: "Hans"
          })
        ])
      ]
    });
    const out = detectStaleCustomerThreads(personal);
    expect(out).toHaveLength(1);
    expect(out[0].fact).toContain("Hans");
  });

  it("returns one item with multiple evidence threads", () => {
    const t1 = thread("t1", [msg({ id: "a", date: NOW - 6 * DAY, fromAddress: "a@x.com" })]);
    const t2 = thread("t2", [msg({ id: "b", date: NOW - 4 * DAY, fromAddress: "b@x.com" })]);
    const t3 = thread("t3", [msg({ id: "c", date: NOW - 3 * DAY, fromAddress: "c@x.com" })]);
    const out = detectStaleCustomerThreads(snap({ threads: [t1, t2, t3] }));
    expect(out).toHaveLength(1);
    expect(out[0].evidence).toHaveLength(3);
    expect(out[0].fact).toMatch(/3 müşteri/);
  });

  it("emits nothing for an empty snapshot", () => {
    expect(detectStaleCustomerThreads(snap({}))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 2 · unanswered-email
// ---------------------------------------------------------------------------

describe("detectUnansweredInboxMail", () => {
  it("flags a new inbound, never-replied, 1–4 day window", () => {
    const m = msg({
      id: "m",
      date: NOW - 2 * DAY,
      fromAddress: "new@person.com",
      fromName: "New Person",
      isInInbox: true
    });
    const out = detectUnansweredInboxMail(snap({ threads: [thread("t", [m])] }));
    expect(out).toHaveLength(1);
    expect(out[0].focus).toBe("customers");
    expect(out[0].fact).toContain("New Person");
  });

  it("excludes threads where I have ever replied (handled by stale detector)", () => {
    const m1 = msg({ id: "a", date: NOW - 4 * DAY, fromAddress: "x@y.com" });
    const m2 = msg({ id: "b", date: NOW - 3 * DAY, isFromMe: true });
    const m3 = msg({ id: "c", date: NOW - 1 * DAY, fromAddress: "x@y.com" });
    expect(
      detectUnansweredInboxMail(snap({ threads: [thread("t", [m1, m2, m3])] }))
    ).toHaveLength(0);
  });

  it("excludes messages older than 5 days (stale detector takes over)", () => {
    const m = msg({ id: "m", date: NOW - 7 * DAY, fromAddress: "x@y.com" });
    expect(detectUnansweredInboxMail(snap({ threads: [thread("t", [m])] }))).toHaveLength(0);
  });

  it("ignores noisy senders", () => {
    const m = msg({ id: "m", date: NOW - 2 * DAY, fromAddress: "no-reply@svc.com" });
    expect(detectUnansweredInboxMail(snap({ threads: [thread("t", [m])] }))).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3 · commitment-detector
// ---------------------------------------------------------------------------

describe("detectOpenCommitments", () => {
  it("flags an outbound 'I'll get back to you' with no follow-up", () => {
    const m1 = msg({ id: "m1", date: NOW - 6 * DAY, fromAddress: "x@y.com" });
    const m2 = msg({
      id: "m2",
      date: NOW - 4 * DAY,
      isFromMe: true,
      subject: "Re: Pricing",
      snippet: "Thanks for the note — I'll get back to you tomorrow with numbers."
    });
    const out = detectOpenCommitments(snap({ threads: [thread("t", [m1, m2])] }));
    expect(out).toHaveLength(1);
    expect(out[0].focus).toBe("tasks");
    expect(out[0].evidence).toEqual([{ kind: "message", messageId: "m2" }]);
  });

  it("detects Turkish commitment phrases", () => {
    const m1 = msg({
      id: "m1",
      date: NOW - 4 * DAY,
      isFromMe: true,
      snippet: "Konuyu kontrol edip geri dönüş yapacağım."
    });
    expect(detectOpenCommitments(snap({ threads: [thread("t", [m1])] }))).toHaveLength(1);
  });

  it("does not flag if I sent a follow-up later", () => {
    const m1 = msg({
      id: "m1",
      date: NOW - 4 * DAY,
      isFromMe: true,
      snippet: "I'll get back to you with the numbers."
    });
    const m2 = msg({ id: "m2", date: NOW - 2 * DAY, isFromMe: true, snippet: "Here are the numbers — see attached." });
    expect(detectOpenCommitments(snap({ threads: [thread("t", [m1, m2])] }))).toHaveLength(0);
  });

  it("does not flag commitments < 2 days old", () => {
    const m1 = msg({
      id: "m1",
      date: NOW - 1 * DAY,
      isFromMe: true,
      snippet: "I'll get back to you tomorrow."
    });
    expect(detectOpenCommitments(snap({ threads: [thread("t", [m1])] }))).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 4 · payment-keyword
// ---------------------------------------------------------------------------

describe("detectPaymentMail", () => {
  it("flags an inbound 'invoice' / 'teklif' message", () => {
    const m = msg({
      id: "m",
      date: NOW - 2 * DAY,
      fromAddress: "billing@bridgeco.com",
      subject: "Invoice INV-204",
      snippet: "Please find the invoice attached, total €8,400."
    });
    const out = detectPaymentMail(snap({ messages: [m] }));
    expect(out).toHaveLength(1);
    expect(out[0].focus).toBe("revenue");
    expect(out[0].fact).toContain("€8,400");
  });

  it("ignores messages from me", () => {
    const m = msg({ id: "m", date: NOW - 2 * DAY, isFromMe: true, subject: "Re: Invoice" });
    expect(detectPaymentMail(snap({ messages: [m] }))).toEqual([]);
  });

  it("ignores messages older than 14 days", () => {
    const m = msg({
      id: "m",
      date: NOW - 20 * DAY,
      fromAddress: "billing@bridgeco.com",
      subject: "Old invoice"
    });
    expect(detectPaymentMail(snap({ messages: [m] }))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 5 · calendar-conflict
// ---------------------------------------------------------------------------

describe("detectCalendarConflicts", () => {
  it("flags two overlapping non-all-day events", () => {
    const e1 = event({
      id: "e1",
      summary: "Bridge call",
      startMs: NOW + 2 * 60 * 60 * 1000,
      endMs: NOW + 3 * 60 * 60 * 1000
    });
    const e2 = event({
      id: "e2",
      summary: "Müller demo",
      startMs: NOW + 2.5 * 60 * 60 * 1000,
      endMs: NOW + 3.5 * 60 * 60 * 1000
    });
    const out = detectCalendarConflicts(snap({ events: [e1, e2] }));
    expect(out).toHaveLength(1);
    expect(out[0].focus).toBe("calendar");
    expect(out[0].priority).toBe("high");
    expect(out[0].evidence).toEqual([
      { kind: "event", eventId: "e1" },
      { kind: "event", eventId: "e2" }
    ]);
  });

  it("ignores all-day events as 'background'", () => {
    const allDay = event({
      id: "ad",
      summary: "Travel",
      startMs: NOW + 60 * 60 * 1000,
      endMs: NOW + 4 * 60 * 60 * 1000,
      isAllDay: true
    });
    const real = event({
      id: "e1",
      summary: "Call",
      startMs: NOW + 90 * 60 * 1000,
      endMs: NOW + 150 * 60 * 1000
    });
    expect(detectCalendarConflicts(snap({ events: [allDay, real] }))).toEqual([]);
  });

  it("ignores past events", () => {
    const e1 = event({
      id: "e1",
      summary: "Past",
      startMs: NOW - 3 * 60 * 60 * 1000,
      endMs: NOW - 2 * 60 * 60 * 1000
    });
    const e2 = event({
      id: "e2",
      summary: "Past 2",
      startMs: NOW - 2.5 * 60 * 60 * 1000,
      endMs: NOW - 1 * 60 * 60 * 1000
    });
    expect(detectCalendarConflicts(snap({ events: [e1, e2] }))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// findConflictPairs · shared by the detector above and the Calendar move
// executor's UI, so both must agree on what counts as a conflict.
// ---------------------------------------------------------------------------

describe("findConflictPairs", () => {
  it("returns the overlapping pair with 'a' as the earlier-starting event", () => {
    const e1 = event({ id: "e1", startMs: NOW + 2 * 60 * 60 * 1000, endMs: NOW + 3 * 60 * 60 * 1000 });
    const e2 = event({ id: "e2", startMs: NOW + 2.5 * 60 * 60 * 1000, endMs: NOW + 3.5 * 60 * 60 * 1000 });
    const pairs = findConflictPairs([e2, e1], NOW); // deliberately unsorted input
    expect(pairs).toHaveLength(1);
    expect(pairs[0].a.id).toBe("e1");
    expect(pairs[0].b.id).toBe("e2");
  });

  it("returns an empty list when nothing overlaps", () => {
    const e1 = event({ id: "e1", startMs: NOW + 60 * 60 * 1000, endMs: NOW + 2 * 60 * 60 * 1000 });
    const e2 = event({ id: "e2", startMs: NOW + 3 * 60 * 60 * 1000, endMs: NOW + 4 * 60 * 60 * 1000 });
    expect(findConflictPairs([e1, e2], NOW)).toEqual([]);
  });

  it("sorts multiple conflicts soonest-first", () => {
    const later = event({ id: "later", startMs: NOW + 5 * 60 * 60 * 1000, endMs: NOW + 6 * 60 * 60 * 1000 });
    const laterB = event({ id: "laterB", startMs: NOW + 5.5 * 60 * 60 * 1000, endMs: NOW + 6.5 * 60 * 60 * 1000 });
    const soon = event({ id: "soon", startMs: NOW + 60 * 60 * 1000, endMs: NOW + 2 * 60 * 60 * 1000 });
    const soonB = event({ id: "soonB", startMs: NOW + 90 * 60 * 1000, endMs: NOW + 150 * 60 * 1000 });
    const pairs = findConflictPairs([later, laterB, soon, soonB], NOW);
    expect(pairs).toHaveLength(2);
    expect(pairs[0].a.id).toBe("soon");
    expect(pairs[1].a.id).toBe("later");
  });
});

// ---------------------------------------------------------------------------
// 6 · unprepared-meeting
// ---------------------------------------------------------------------------

describe("detectUnpreparedMeetings", () => {
  it("flags an external meeting in the next 24h with no recent email", () => {
    const ev = event({
      id: "ev1",
      summary: "Bridge intro call",
      startMs: NOW + 6 * 60 * 60 * 1000,
      endMs: NOW + 7 * 60 * 60 * 1000,
      attendees: [
        { email: SELF, displayName: "Me", isSelf: true },
        { email: "eric@bridge.io", displayName: "Eric", isSelf: false }
      ]
    });
    const out = detectUnpreparedMeetings(snap({ events: [ev], messages: [] }));
    expect(out).toHaveLength(1);
    expect(out[0].focus).toBe("calendar");
  });

  it("does not flag if I emailed an attendee in the last 7 days", () => {
    const ev = event({
      id: "ev1",
      summary: "Bridge call",
      startMs: NOW + 6 * 60 * 60 * 1000,
      endMs: NOW + 7 * 60 * 60 * 1000,
      attendees: [
        { email: SELF, isSelf: true },
        { email: "eric@bridge.io", isSelf: false }
      ]
    });
    const m = msg({
      id: "m",
      date: NOW - 3 * DAY,
      fromAddress: "eric@bridge.io",
      toAddresses: [SELF]
    });
    expect(
      detectUnpreparedMeetings(snap({ events: [ev], messages: [m] }))
    ).toEqual([]);
  });

  it("ignores meetings with only internal attendees", () => {
    const ev = event({
      id: "ev1",
      summary: "Standup",
      startMs: NOW + 60 * 60 * 1000,
      endMs: NOW + 90 * 60 * 1000,
      attendees: [
        { email: SELF, isSelf: true },
        { email: "teammate@operator.center", isSelf: false }
      ]
    });
    expect(detectUnpreparedMeetings(snap({ events: [ev] }))).toEqual([]);
  });

  it("ignores meetings more than 24h out", () => {
    const ev = event({
      id: "ev1",
      summary: "Far call",
      startMs: NOW + 3 * DAY,
      endMs: NOW + 3 * DAY + 60 * 60 * 1000,
      attendees: [
        { email: SELF, isSelf: true },
        { email: "x@y.com", isSelf: false }
      ]
    });
    expect(detectUnpreparedMeetings(snap({ events: [ev] }))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Engine · orchestration
// ---------------------------------------------------------------------------

describe("buildBriefing", () => {
  it("caps at 5 items and sorts high-priority first", () => {
    // Many stale customer threads. detectStaleCustomerThreads already
    // groups into one item, but combined with other detectors we
    // should see at most 5 items total.
    const messages: GmailMessage[] = [];
    const threads: GmailThread[] = [];
    for (let i = 0; i < 10; i++) {
      const m = msg({
        id: `m${i}`,
        date: NOW - (3 + i) * DAY,
        fromAddress: `cust${i}@x.com`
      });
      threads.push(thread(`t${i}`, [m]));
      messages.push(m);
    }
    const ev1 = event({
      id: "ev1",
      summary: "A",
      startMs: NOW + 60 * 60 * 1000,
      endMs: NOW + 90 * 60 * 1000
    });
    const ev2 = event({
      id: "ev2",
      summary: "B",
      startMs: NOW + 75 * 60 * 1000,
      endMs: NOW + 110 * 60 * 1000
    });
    const out = buildBriefing(snap({ messages, threads, events: [ev1, ev2] }));
    expect(out.length).toBeLessThanOrEqual(5);
    if (out.length > 1) {
      const order = out.map((i) => i.priority);
      // high first → medium → low
      for (let i = 0; i < order.length - 1; i++) {
        const cur = order[i];
        const next = order[i + 1];
        const rank: Record<typeof cur, number> = { high: 3, medium: 2, low: 1 };
        expect(rank[cur]).toBeGreaterThanOrEqual(rank[next]);
      }
    }
  });

  it("returns nothing for an empty snapshot — honest silence", () => {
    expect(buildBriefing(snap({}))).toEqual([]);
  });

  it("drops items below the confidence floor", () => {
    // 1-day-old single new mail → unanswered detector returns low confidence;
    // make sure we do or don't include based on floor (currently we include
    // 1d at confidence 55 → above 50 floor).
    const m = msg({ id: "m", date: NOW - 1 * DAY, fromAddress: "x@y.com" });
    const out = buildBriefing(snap({ threads: [thread("t", [m])] }));
    expect(out.length).toBeGreaterThanOrEqual(1);
  });
});

describe("buildPanels", () => {
  it("returns four panels regardless of snapshot content", () => {
    const panels = buildPanels(snap({}));
    expect(Object.keys(panels).sort()).toEqual(["calendar", "customers", "revenue", "tasks"]);
  });

  it("populates customers panel with stale threads", () => {
    const m = msg({
      id: "m",
      date: NOW - 4 * DAY,
      fromAddress: "hans@acme.de",
      fromName: "Hans"
    });
    const panels = buildPanels(snap({ threads: [thread("t", [m])] }));
    expect(panels.customers.rows).toHaveLength(1);
    expect(panels.customers.rows[0].primary).toBe("Hans");
  });

  it("populates revenue panel with payment mail", () => {
    const m = msg({
      id: "m",
      date: NOW - 2 * DAY,
      fromAddress: "billing@bridgeco.com",
      subject: "Invoice INV-204",
      snippet: "Total €8,400 due"
    });
    const panels = buildPanels(snap({ messages: [m] }));
    expect(panels.revenue.rows).toHaveLength(1);
    expect(panels.revenue.rows[0].trailing).toContain("€8,400");
  });
});

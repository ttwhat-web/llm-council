import { describe, expect, it } from "vitest";
import {
  collectArchiveCandidates,
  MAX_ARCHIVE_PER_BATCH,
  SILENT_ARCHIVE_CONFIDENCE_THRESHOLD
} from "@/services/drafting/archiveCandidates";
import type { GmailMessage, GmailThread, WorkspaceSnapshot } from "@/services/google/types";

const NOW = Date.UTC(2026, 5, 16, 8, 0, 0);

function msg(p: Partial<GmailMessage> & { id: string }): GmailMessage {
  return {
    id: p.id,
    threadId: p.threadId ?? `t-${p.id}`,
    date: p.date ?? NOW,
    fromName: p.fromName ?? "",
    fromAddress: (p.fromAddress ?? "noreply@service.com").toLowerCase(),
    toAddresses: p.toAddresses ?? ["me@operator.center"],
    subject: p.subject ?? "",
    snippet: p.snippet ?? "",
    isFromMe: p.isFromMe ?? false,
    isInInbox: p.isInInbox ?? true,
    isUnread: p.isUnread ?? false,
    labels: p.labels ?? []
  };
}

function snap(messages: GmailMessage[], threads: GmailThread[] = []): WorkspaceSnapshot {
  return { syncedAt: NOW, selfEmail: "me@operator.center", messages, threads, events: [], contacts: [] };
}

describe("collectArchiveCandidates · genuine noise", () => {
  it("returns null-safe empty array with no snapshot", () => {
    expect(collectArchiveCandidates(null)).toEqual([]);
  });

  it("silently-archivable confidence (>=95) when prefix AND domain both agree, in a single-message thread", () => {
    const m = msg({ id: "m1", fromAddress: "noreply@github.com", fromName: "GitHub", subject: "[repo] New issue" });
    const out = collectArchiveCandidates(snap([m]));
    expect(out).toHaveLength(1);
    expect(out[0].confidence).toBeGreaterThanOrEqual(SILENT_ARCHIVE_CONFIDENCE_THRESHOLD);
    expect(out[0].reason).toMatch(/automated prefix/);
    expect(out[0].reason).toMatch(/automated domain/);
  });

  it("lower confidence (below threshold) when only the prefix matches, not a known domain", () => {
    const m = msg({ id: "m1", fromAddress: "notifications@some-random-startup.com", subject: "Weekly digest" });
    const out = collectArchiveCandidates(snap([m]));
    expect(out).toHaveLength(1);
    expect(out[0].confidence).toBeLessThan(SILENT_ARCHIVE_CONFIDENCE_THRESHOLD);
  });

  it("falls back to the address when there's no display name", () => {
    const m = msg({ id: "m1", fromAddress: "noreply@github.com", fromName: "" });
    expect(collectArchiveCandidates(snap([m]))[0].fromName).toBe("noreply@github.com");
  });

  it("caps at MAX_ARCHIVE_PER_BATCH", () => {
    const messages = Array.from({ length: MAX_ARCHIVE_PER_BATCH + 5 }, (_, i) =>
      msg({ id: `m${i}`, fromAddress: "noreply@github.com" })
    );
    expect(collectArchiveCandidates(snap(messages))).toHaveLength(MAX_ARCHIVE_PER_BATCH);
  });
});

describe("collectArchiveCandidates · structural exclusions", () => {
  it("excludes a message that isn't noise at all — a real, unrecognized sender", () => {
    const m = msg({ id: "m1", fromAddress: "hans@acme.de" });
    expect(collectArchiveCandidates(snap([m]))).toEqual([]);
  });

  it("excludes a message the founder sent", () => {
    const m = msg({ id: "m1", fromAddress: "noreply@github.com", isFromMe: true });
    expect(collectArchiveCandidates(snap([m]))).toEqual([]);
  });

  it("excludes a message that's already out of the inbox", () => {
    const m = msg({ id: "m1", fromAddress: "noreply@github.com", isInInbox: false });
    expect(collectArchiveCandidates(snap([m]))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Hard denies — never a candidate at any confidence, even from a
// noise-looking sender. These are the false-positive scenarios that
// must never be silently (or even approval-required-ly, well —
// approval-required IS fine; NEVER-a-candidate is the bar) archived
// without the founder's plain awareness that it's a real message.
// ---------------------------------------------------------------------------

describe("collectArchiveCandidates · never archives — false positive guards", () => {
  it("customer email — a real, unrecognized sender never even reaches the noise check", () => {
    const m = msg({ id: "m1", fromAddress: "hans@acme.de", fromName: "Hans Müller", subject: "Question about the tour" });
    expect(collectArchiveCandidates(snap([m]))).toEqual([]);
  });

  it("supplier email — same rule, a real domain isn't on the noise list", () => {
    const m = msg({ id: "m1", fromAddress: "orders@ourprintsupplier.com", subject: "Stock update" });
    expect(collectArchiveCandidates(snap([m]))).toEqual([]);
  });

  it("invoice — denied by keyword even from an automated-looking sender", () => {
    const m = msg({ id: "m1", fromAddress: "notifications@billingco.com", subject: "Your invoice #4471 is ready" });
    expect(collectArchiveCandidates(snap([m]))).toEqual([]);
  });

  it("payment — denied by keyword even from an automated-looking sender", () => {
    const m = msg({ id: "m1", fromAddress: "noreply@stripe.com", subject: "You've been paid: $1,200.00" });
    expect(collectArchiveCandidates(snap([m]))).toEqual([]);
  });

  it("proposal — denied by keyword", () => {
    const m = msg({ id: "m1", fromAddress: "notifications@dealroom.com", subject: "New proposal from Acme Corp" });
    expect(collectArchiveCandidates(snap([m]))).toEqual([]);
  });

  it("reservation — denied by keyword", () => {
    const m = msg({ id: "m1", fromAddress: "notifications@booking.com", subject: "Your reservation is confirmed" });
    expect(collectArchiveCandidates(snap([m]))).toEqual([]);
  });

  it("legal — denied by keyword", () => {
    const m = msg({ id: "m1", fromAddress: "noreply@docusign.net", subject: "Please sign: Service Agreement" });
    expect(collectArchiveCandidates(snap([m]))).toEqual([]);
  });

  it("calendar invite — denied by subject prefix even from a noise-looking sender", () => {
    const m = msg({ id: "m1", fromAddress: "noreply@calendar.google.com", subject: "Invitation: Bridge demo @ Tue Jun 16" });
    expect(collectArchiveCandidates(snap([m]))).toEqual([]);
  });

  it("calendar invite — denied by the calendar-notification sender pattern even with a plain subject", () => {
    const m = msg({ id: "m1", fromAddress: "calendar-notification@google.com", subject: "Tour planning sync" });
    expect(collectArchiveCandidates(snap([m]))).toEqual([]);
  });

  it("human reply thread — denied even though the message itself looks like noise", () => {
    const t = {
      id: "t1",
      subject: "Re: Your account",
      messages: [
        msg({ id: "m0", threadId: "t1", fromAddress: "me@operator.center", isFromMe: true, date: NOW - 1000 }),
        msg({ id: "m1", threadId: "t1", fromAddress: "notifications@service.com", date: NOW })
      ]
    };
    const m1 = t.messages[1];
    expect(collectArchiveCandidates(snap([m1], [t]))).toEqual([]);
  });
});

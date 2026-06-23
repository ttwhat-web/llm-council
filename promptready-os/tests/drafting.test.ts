/**
 * Drafting prompt + URL · fixture tests.
 *
 * The network call to Anthropic is not exercised here. What IS
 * exercised: the prompt builder (so the model gets the right context
 * shape every time) and the Gmail compose-URL builder (so the
 * founder's "Open in Gmail" click prefills the right To / Subject /
 * Body).
 */

import { describe, expect, it } from "vitest";
import {
  buildDraftPrompt,
  buildDraftSubject,
  buildGmailComposeUrl
} from "@/services/drafting/draftReply";
import type { DraftRequest } from "@/services/drafting/types";
import type { GmailMessage } from "@/services/google/types";

const NOW = Date.UTC(2026, 5, 16, 8, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

function msg(p: Partial<GmailMessage> & { id: string; date: number; fromAddress: string }): GmailMessage {
  return {
    id: p.id,
    threadId: p.threadId ?? `t-${p.id}`,
    date: p.date,
    fromName: p.fromName ?? "",
    fromAddress: p.fromAddress.toLowerCase(),
    toAddresses: p.toAddresses ?? ["tunc@operator.center"],
    subject: p.subject ?? "",
    snippet: p.snippet ?? "",
    isFromMe: p.isFromMe ?? false,
    isInInbox: p.isInInbox ?? true,
    isUnread: p.isUnread ?? false,
    labels: p.labels ?? []
  };
}

describe("buildDraftPrompt", () => {
  const req: DraftRequest = {
    context: {
      customerName: "Hans Müller",
      customerEmail: "hans@acme.de",
      threadMessages: [
        msg({
          id: "m1",
          date: NOW - 6 * DAY,
          fromAddress: "hans@acme.de",
          fromName: "Hans Müller",
          subject: "Tour package",
          snippet: "Guten Tag, hätten Sie Verfügbarkeit im Juli für 6 Personen?"
        }),
        msg({
          id: "m2",
          date: NOW - 5 * DAY,
          fromAddress: "tunc@operator.center",
          isFromMe: true,
          subject: "Re: Tour package",
          snippet: "Yes — sending a draft itinerary tomorrow."
        }),
        msg({
          id: "m3",
          date: NOW - 6 * DAY + 60_000,
          fromAddress: "hans@acme.de",
          fromName: "Hans Müller",
          subject: "Re: Tour package",
          snippet: "Klingt gut, ich warte auf den Vorschlag."
        })
      ],
      daysSinceLastInbound: 6,
      subject: "Tour package"
    },
    founderFirstName: "Tunç",
    intent: "follow-up"
  };

  it("includes the customer name, email, gap, and subject", () => {
    const out = buildDraftPrompt(req);
    expect(out).toContain("Hans Müller");
    expect(out).toContain("hans@acme.de");
    expect(out).toContain("Days since their last message: 6");
    expect(out).toContain("Tour package");
  });

  it("includes the last messages as a transcript", () => {
    const out = buildDraftPrompt(req);
    expect(out).toContain("Klingt gut, ich warte auf den Vorschlag.");
    expect(out).toContain("Guten Tag, hätten Sie Verfügbarkeit");
  });

  it("instructs language matching, length, and the founder signature", () => {
    const out = buildDraftPrompt(req);
    expect(out).toContain("Matches the language of the most recent customer message");
    expect(out).toMatch(/SHORT/);
    expect(out).toContain(`Signs off with exactly: "— Tunç"`);
  });

  it("falls back to an em-dash signature when no founder name is set", () => {
    const out = buildDraftPrompt({ ...req, founderFirstName: null });
    expect(out).toContain(`Signs off with exactly: "—"`);
  });
});

describe("buildDraftSubject", () => {
  it("prefixes Re: when missing", () => {
    expect(buildDraftSubject({ subject: "Tour package" } as DraftRequest["context"])).toBe(
      "Re: Tour package"
    );
  });
  it("leaves an existing Re: alone", () => {
    expect(buildDraftSubject({ subject: "Re: Tour package" } as DraftRequest["context"])).toBe(
      "Re: Tour package"
    );
  });
  it("uses 'Following up' when there is no subject", () => {
    expect(buildDraftSubject({ subject: "" } as DraftRequest["context"])).toBe("Re: Following up");
  });
});

describe("buildGmailComposeUrl", () => {
  it("encodes to / subject / body into a Gmail compose URL", () => {
    const url = buildGmailComposeUrl({
      to: "hans@acme.de",
      subject: "Re: Tour package",
      body: "Lieber Hans,\n\nWollte nur kurz nachfragen.\n\n— Tunç"
    });
    const u = new URL(url);
    expect(u.host).toBe("mail.google.com");
    expect(u.searchParams.get("view")).toBe("cm");
    expect(u.searchParams.get("fs")).toBe("1");
    expect(u.searchParams.get("to")).toBe("hans@acme.de");
    expect(u.searchParams.get("su")).toBe("Re: Tour package");
    expect(u.searchParams.get("body")).toContain("Lieber Hans");
    expect(u.searchParams.get("body")).toContain("— Tunç");
  });
});

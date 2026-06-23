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
import { OPERATOR_SYSTEM_PROMPT } from "@/services/operator/voice";
import { DEMO_FOUNDER_SEED, renderFounderProfile } from "@/services/operator/memorySeed";
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
    expect(out).toContain("Match the language of the customer's most recent message");
    expect(out).toMatch(/2 to 3 sentences/);
    expect(out).toContain(`Sign off with exactly: "— Tunç"`);
  });

  it("falls back to an em-dash signature when no founder name is set", () => {
    const out = buildDraftPrompt({ ...req, founderFirstName: null });
    expect(out).toContain(`Sign off with exactly: "—"`);
  });
});

describe("OPERATOR_SYSTEM_PROMPT", () => {
  it("declares Operator's identity and primary question", () => {
    expect(OPERATOR_SYSTEM_PROMPT).toContain("You are Operator.");
    expect(OPERATOR_SYSTEM_PROMPT).toContain("Chief of Staff");
    expect(OPERATOR_SYSTEM_PROMPT).toContain("What deserves my attention right now?");
  });

  it("locks the voice rules (no ChatGPT-isms, calm, brief)", () => {
    expect(OPERATOR_SYSTEM_PROMPT).toContain("Never act like ChatGPT.");
    expect(OPERATOR_SYSTEM_PROMPT).toContain("Never give long essays.");
    expect(OPERATOR_SYSTEM_PROMPT).toContain("Silence is better than hallucination.");
  });

  it("locks the FACT / WHY IT MATTERS / RECOMMENDATION format", () => {
    expect(OPERATOR_SYSTEM_PROMPT).toContain("FACT");
    expect(OPERATOR_SYSTEM_PROMPT).toContain("WHY IT MATTERS");
    expect(OPERATOR_SYSTEM_PROMPT).toContain("RECOMMENDATION");
    expect(OPERATOR_SYSTEM_PROMPT).toContain("Exactly one action.");
  });

  it("locks the prioritization order: money, customers, deadlines, reputation", () => {
    const idx = (s: string) => OPERATOR_SYSTEM_PROMPT.indexOf(s);
    expect(idx("1. Money")).toBeGreaterThan(-1);
    expect(idx("2. Customers")).toBeGreaterThan(idx("1. Money"));
    expect(idx("3. Deadlines")).toBeGreaterThan(idx("2. Customers"));
    expect(idx("4. Reputation")).toBeGreaterThan(idx("3. Deadlines"));
  });

  it("does NOT hardcode any specific founder name or company", () => {
    // The voice contract is universal. Personal context lives in
    // memory / sources / profile — never in the global prompt.
    expect(OPERATOR_SYSTEM_PROMPT).not.toContain("Tunç");
    expect(OPERATOR_SYSTEM_PROMPT).not.toContain("Habitat VIP Travel");
    expect(OPERATOR_SYSTEM_PROMPT).not.toContain("Erguvan Turizm");
    expect(OPERATOR_SYSTEM_PROMPT).not.toContain("Avanos Halı");
    expect(OPERATOR_SYSTEM_PROMPT).not.toContain("Perge Jewels");
  });

  it("instructs the model to source company context from memory + sources", () => {
    expect(OPERATOR_SYSTEM_PROMPT).toMatch(/come from memory and connected sources/);
    expect(OPERATOR_SYSTEM_PROMPT).toContain("Never invent company context.");
    expect(OPERATOR_SYSTEM_PROMPT).toContain("If memory is empty, stay generic.");
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

describe("memorySeed", () => {
  it("DEMO_FOUNDER_SEED carries the demo-only founder context", () => {
    expect(DEMO_FOUNDER_SEED.firstName).toBe("Tunç");
    expect(DEMO_FOUNDER_SEED.companies).toContain("Habitat VIP Travel");
    expect(DEMO_FOUNDER_SEED.companies).toContain("Erguvan Turizm");
    expect(DEMO_FOUNDER_SEED.companies).toContain("Avanos Halı");
    expect(DEMO_FOUNDER_SEED.companies).toContain("Perge Jewels");
  });

  it("renderFounderProfile returns '' for a null seed (so callers can interpolate unconditionally)", () => {
    expect(renderFounderProfile(null)).toBe("");
  });

  it("renderFounderProfile names the founder + companies + markets when provided", () => {
    const out = renderFounderProfile(DEMO_FOUNDER_SEED);
    expect(out).toContain("Founder profile (from memory)");
    expect(out).toContain("Tunç");
    expect(out).toContain("Habitat VIP Travel");
    expect(out).toContain("European luxury");
  });

  it("the seed file is not the voice prompt — the global prompt stays clean", () => {
    // Belt-and-braces: the voice prompt must not contain any string
    // that uniquely lives in the seed.
    for (const company of DEMO_FOUNDER_SEED.companies) {
      expect(OPERATOR_SYSTEM_PROMPT).not.toContain(company);
    }
    expect(OPERATOR_SYSTEM_PROMPT).not.toContain(DEMO_FOUNDER_SEED.firstName);
  });
});

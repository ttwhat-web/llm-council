/**
 * Operator's read · prompt builder tests (no network).
 */

import { describe, expect, it } from "vitest";
import { buildOperatorReadPrompt } from "@/services/briefing/operatorRead";
import { EMPTY_MEMORY, type FounderMemory } from "@/services/operator/memorySeed";
import type { BriefingItem } from "@/services/briefing/types";

function item(p: Partial<BriefingItem> & { id: string; fact: string }): BriefingItem {
  return {
    id: p.id,
    detector: p.detector ?? "stale-customer-thread",
    focus: p.focus ?? "customers",
    priority: p.priority ?? "high",
    confidence: p.confidence ?? 80,
    fact: p.fact,
    why: p.why ?? "",
    recommendation: p.recommendation ?? "",
    verb: p.verb ?? "open",
    evidence: p.evidence ?? []
  };
}

const items: BriefingItem[] = [
  item({ id: "a", fact: "Bridge & Co. invoice unpaid · €8,400", priority: "high", focus: "revenue" }),
  item({ id: "b", fact: "3 customers waiting 5 days", priority: "high", focus: "customers" }),
  item({ id: "c", fact: "Tomorrow 10:30 has a calendar conflict", priority: "medium", focus: "calendar" })
];

describe("buildOperatorReadPrompt", () => {
  it("lists every surfaced item with its priority", () => {
    const out = buildOperatorReadPrompt(items, null);
    expect(out).toContain("[high] Bridge & Co. invoice unpaid · €8,400");
    expect(out).toContain("[high] 3 customers waiting 5 days");
    expect(out).toContain("[medium] Tomorrow 10:30 has a calendar conflict");
  });

  it("encodes the money-first ranking instruction", () => {
    const out = buildOperatorReadPrompt(items, null);
    expect(out).toMatch(/money first, then customers,\s*then deadlines, then reputation/);
    expect(out).toContain("do not invent");
  });

  it("asks for 1–2 sentences, no preamble", () => {
    const out = buildOperatorReadPrompt(items, null);
    expect(out).toContain("1–2 short sentences");
    expect(out).toContain("No greeting, no list, no preamble");
  });

  it("includes the founder profile block when memory is populated", () => {
    const m: FounderMemory = { ...EMPTY_MEMORY, firstName: "Tunç", companies: ["Habitat VIP Travel"] };
    const out = buildOperatorReadPrompt(items, m);
    expect(out).toContain("Founder profile (from memory)");
    expect(out).toContain("Habitat VIP Travel");
  });

  it("omits the profile block for empty memory", () => {
    const out = buildOperatorReadPrompt(items, EMPTY_MEMORY);
    expect(out).not.toContain("Founder profile (from memory)");
  });
});

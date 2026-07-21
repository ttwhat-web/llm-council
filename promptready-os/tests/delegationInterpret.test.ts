import { describe, expect, it } from "vitest";
import { interpretRequest } from "@/services/delegation/interpret";

describe("interpretRequest · deterministic, no AI call", () => {
  it("returns unsupported for an empty request", () => {
    expect(interpretRequest("").unsupported).toBe(true);
    expect(interpretRequest("   ").unsupported).toBe(true);
  });

  it("returns unsupported for a sentence matching no capability", () => {
    const r = interpretRequest("Write me a poem about the ocean.");
    expect(r.unsupported).toBe(true);
    expect(r.clauses).toEqual([]);
  });

  it("'Handle my morning.' expands to all three capabilities", () => {
    const r = interpretRequest("Handle my morning.");
    expect(r.unsupported).toBe(false);
    expect(r.clauses.map((c) => c.intent).sort()).toEqual(["archiveNoise", "followUp", "resolveConflicts"]);
  });

  it("'Follow up with the customers who are waiting.' → followUp, no person hint", () => {
    const r = interpretRequest("Follow up with the customers who are waiting.");
    expect(r.clauses).toEqual([{ intent: "followUp" }]);
  });

  it("'Resolve tomorrow's calendar conflicts.' → resolveConflicts, no meeting hint", () => {
    const r = interpretRequest("Resolve tomorrow's calendar conflicts.");
    expect(r.clauses).toEqual([{ intent: "resolveConflicts" }]);
  });

  it("'Prepare everything that needs my approval.' → followUp + resolveConflicts, never archive", () => {
    const r = interpretRequest("Prepare everything that needs my approval.");
    expect(r.clauses.map((c) => c.intent).sort()).toEqual(["followUp", "resolveConflicts"]);
  });

  it("'Take care of the low-risk inbox noise.' → archiveNoise only", () => {
    const r = interpretRequest("Take care of the low-risk inbox noise.");
    expect(r.clauses).toEqual([{ intent: "archiveNoise" }]);
  });

  it("'Reply to Hans and move the internal meeting.' → two clauses with real hints", () => {
    const r = interpretRequest("Reply to Hans and move the internal meeting.");
    expect(r.clauses).toEqual([
      { intent: "followUp", personHint: "Hans" },
      { intent: "resolveConflicts", meetingHint: "internal meeting" }
    ]);
  });

  it("splits on ';' as well as 'and'", () => {
    const r = interpretRequest("Reply to Anna; archive the newsletters.");
    expect(r.clauses.map((c) => c.intent).sort()).toEqual(["archiveNoise", "followUp"]);
  });
});

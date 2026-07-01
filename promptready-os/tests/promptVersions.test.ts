import { describe, expect, it } from "vitest";
import { computeVersionStats } from "@/services/drafting/promptVersions";

describe("computeVersionStats · prompt versions must prove themselves", () => {
  it("scores approval-without-edit rate per version", () => {
    const stats = computeVersionStats([
      { promptVersion: "v17", rating: "perfect" },
      { promptVersion: "v17", rating: "needed_edits" },
      { promptVersion: "v17", rating: "perfect" },
      { promptVersion: "v18", rating: "perfect" },
      { promptVersion: "v18", rating: "perfect" }
    ]);
    const v17 = stats.find((s) => s.version === "v17")!;
    const v18 = stats.find((s) => s.version === "v18")!;
    expect(v17.total).toBe(3);
    expect(v17.perfect).toBe(2);
    expect(v17.approvalWithoutEditRate).toBeCloseTo(2 / 3, 5);
    expect(v18.total).toBe(2);
    expect(v18.approvalWithoutEditRate).toBe(1);
  });

  it("counts not_usable and needed_edits separately from perfect", () => {
    const stats = computeVersionStats([
      { promptVersion: "v1", rating: "not_usable" },
      { promptVersion: "v1", rating: "needed_edits" }
    ]);
    const v1 = stats.find((s) => s.version === "v1")!;
    expect(v1.perfect).toBe(0);
    expect(v1.neededEdits).toBe(1);
    expect(v1.notUsable).toBe(1);
    expect(v1.approvalWithoutEditRate).toBe(0);
  });

  it("returns an empty list for no feedback", () => {
    expect(computeVersionStats([])).toEqual([]);
  });
});

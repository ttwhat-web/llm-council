import { describe, expect, it } from "vitest";
import { levenshteinDistance } from "@/services/text/editDistance";

describe("levenshteinDistance", () => {
  it("is 0 for identical strings", () => {
    expect(levenshteinDistance("hello", "hello")).toBe(0);
  });

  it("equals the length of the other string when one is empty", () => {
    expect(levenshteinDistance("", "abc")).toBe(3);
    expect(levenshteinDistance("abc", "")).toBe(3);
  });

  it("counts a single substitution as distance 1", () => {
    expect(levenshteinDistance("cat", "cot")).toBe(1);
  });

  it("counts insertions and deletions correctly", () => {
    expect(levenshteinDistance("kitten", "sitting")).toBe(3);
  });
});

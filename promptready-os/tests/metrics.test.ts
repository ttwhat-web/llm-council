/**
 * Metrics aggregates · the KPI math (no store, pure).
 */

import { describe, expect, it } from "vitest";
import { computeAggregates, type MetricEvent } from "@/store/metrics";

function ev(actionId: string, type: MetricEvent["type"], at: number): MetricEvent {
  return { actionId, type, at };
}

describe("computeAggregates · approval-without-edit KPI", () => {
  it("returns null rate when there are no approvals", () => {
    const a = computeAggregates([ev("x", "generated", 1), ev("x", "shown", 2)]);
    expect(a.approved).toBe(0);
    expect(a.approvalWithoutEditRate).toBeNull();
  });

  it("counts an unedited approval as approval-without-edit", () => {
    const a = computeAggregates([
      ev("x", "generated", 1),
      ev("x", "shown", 2),
      ev("x", "approved", 3)
    ]);
    expect(a.approved).toBe(1);
    expect(a.approvalWithoutEdit).toBe(1);
    expect(a.approvalWithoutEditRate).toBe(1);
  });

  it("excludes edited drafts from approval-without-edit", () => {
    const a = computeAggregates([
      ev("x", "generated", 1),
      ev("x", "edited", 2),
      ev("x", "approved", 3)
    ]);
    expect(a.approvalWithoutEdit).toBe(0);
    expect(a.approvalWithoutEditRate).toBe(0);
  });

  it("computes the rate across a mixed batch", () => {
    const a = computeAggregates([
      // a: approved, no edit
      ev("a", "generated", 1),
      ev("a", "approved", 2),
      // b: edited then approved
      ev("b", "generated", 1),
      ev("b", "edited", 2),
      ev("b", "approved", 3),
      // c: approved, no edit
      ev("c", "generated", 1),
      ev("c", "approved", 2)
    ]);
    expect(a.approved).toBe(3);
    expect(a.approvalWithoutEdit).toBe(2);
    expect(a.approvalWithoutEditRate).toBeCloseTo(2 / 3, 5);
  });
});

describe("computeAggregates · funnel + timing", () => {
  it("counts each event type by distinct action", () => {
    const a = computeAggregates([
      ev("a", "generated", 1),
      ev("a", "generated", 1), // duplicate ignored by distinct-id
      ev("a", "sent", 5),
      ev("b", "generated", 1),
      ev("b", "failed", 2)
    ]);
    expect(a.generated).toBe(2);
    expect(a.sent).toBe(1);
    expect(a.failed).toBe(1);
  });

  it("computes median completion (generated → sent)", () => {
    const a = computeAggregates([
      ev("a", "generated", 0),
      ev("a", "sent", 1000),
      ev("b", "generated", 0),
      ev("b", "sent", 3000),
      ev("c", "generated", 0),
      ev("c", "sent", 2000)
    ]);
    // durations 1000, 2000, 3000 → median 2000
    expect(a.medianCompletionMs).toBe(2000);
  });

  it("returns null median when nothing has been sent", () => {
    const a = computeAggregates([ev("a", "generated", 0), ev("a", "approved", 1)]);
    expect(a.medianCompletionMs).toBeNull();
  });

  it("computes median time-to-approve (generated → approved) separately from send", () => {
    const a = computeAggregates([
      ev("a", "generated", 0),
      ev("a", "approved", 500),
      ev("a", "sent", 30_500), // 30s undo window shouldn't pollute time-to-approve
      ev("b", "generated", 0),
      ev("b", "approved", 1500)
    ]);
    // approve durations 500, 1500 → median 1000
    expect(a.medianTimeToApproveMs).toBe(1000);
  });

  it("returns null time-to-approve when nothing has been approved", () => {
    const a = computeAggregates([ev("a", "generated", 0)]);
    expect(a.medianTimeToApproveMs).toBeNull();
  });
});

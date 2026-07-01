import { beforeEach, describe, expect, it } from "vitest";
import { useFeedbackStore } from "@/store/feedback";

beforeEach(() => {
  useFeedbackStore.getState().reset();
});

describe("useFeedbackStore · founder feedback, never assumptions", () => {
  it("records a perfect rating with the fields the KPI needs", () => {
    useFeedbackStore.getState().recordPerfect({
      actionId: "a",
      promptVersion: "v1",
      model: "claude-haiku-4-5-20251001",
      approvalWithoutEdit: true,
      timeToApproveMs: 4200
    });
    const [event] = useFeedbackStore.getState().events;
    expect(event.rating).toBe("perfect");
    expect(event.approvalWithoutEdit).toBe(true);
    expect(event.timeToApproveMs).toBe(4200);
    expect(event.promptVersion).toBe("v1");
  });

  it("records needed_edits with edit distance and a reason", () => {
    useFeedbackStore.getState().recordNeededEdits({
      actionId: "b",
      promptVersion: "v1",
      model: "claude-haiku-4-5-20251001",
      editDistance: 37,
      editReason: "too_formal"
    });
    const [event] = useFeedbackStore.getState().events;
    expect(event.rating).toBe("needed_edits");
    expect(event.editDistance).toBe(37);
    expect(event.editReason).toBe("too_formal");
    expect(event.approvalWithoutEdit).toBe(false);
  });

  it("stores the free-text 'other' reason when provided", () => {
    useFeedbackStore.getState().recordNeededEdits({
      actionId: "c",
      promptVersion: "v1",
      model: "claude-haiku-4-5-20251001",
      editDistance: 12,
      editReason: "other",
      editReasonOther: "Used the wrong customer name"
    });
    expect(useFeedbackStore.getState().events[0].editReasonOther).toBe("Used the wrong customer name");
  });

  it("records not_usable with the founder's correction", () => {
    useFeedbackStore.getState().recordNotUsable({
      actionId: "d",
      promptVersion: "v1",
      model: "claude-haiku-4-5-20251001",
      correction: "Should have offered a refund, not a discount."
    });
    const [event] = useFeedbackStore.getState().events;
    expect(event.rating).toBe("not_usable");
    expect(event.correction).toBe("Should have offered a refund, not a discount.");
  });

  it("is idempotent per actionId — a second reaction is ignored", () => {
    useFeedbackStore.getState().recordPerfect({
      actionId: "e",
      promptVersion: "v1",
      model: "m",
      approvalWithoutEdit: true,
      timeToApproveMs: 100
    });
    useFeedbackStore.getState().recordNotUsable({
      actionId: "e",
      promptVersion: "v1",
      model: "m",
      correction: "changed my mind"
    });
    expect(useFeedbackStore.getState().events).toHaveLength(1);
    expect(useFeedbackStore.getState().events[0].rating).toBe("perfect");
  });

  it("hasFeedback reflects only actions that received a reaction", () => {
    expect(useFeedbackStore.getState().hasFeedback("f")).toBe(false);
    useFeedbackStore.getState().recordPerfect({
      actionId: "f",
      promptVersion: "v1",
      model: "m",
      approvalWithoutEdit: true,
      timeToApproveMs: null
    });
    expect(useFeedbackStore.getState().hasFeedback("f")).toBe(true);
  });
});

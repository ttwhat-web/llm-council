import { describe, expect, it } from "vitest";
import { buildTimeline } from "@/services/executors/timeline";
import type { Action, ActionLogEntry } from "@/services/executors/types";

function action(overrides: Partial<Action> & { id: string; status: Action["status"] }): Action {
  return {
    executor: "gmail.send",
    params: {},
    title: "Reply to Hans Müller",
    createdAt: 0,
    ...overrides
  };
}

function entry(p: Partial<ActionLogEntry> & { at: number; actionId: string; event: ActionLogEntry["event"] }): ActionLogEntry {
  return { executor: "gmail.send", ...p };
}

describe("buildTimeline", () => {
  it("labels each real log event with the action's title, newest first", () => {
    const items = { a1: action({ id: "a1", status: "completed", receipt: "Sent to hans@acme.de." }) };
    const log = [
      entry({ at: 100, actionId: "a1", event: "prepared" }),
      entry({ at: 200, actionId: "a1", event: "completed" })
    ];
    const out = buildTimeline(log, items);
    expect(out[0].label).toBe("Completed: Reply to Hans Müller");
    expect(out[0].at).toBe(200);
    expect(out[1].label).toBe("Prepared: Reply to Hans Müller");
  });

  it("uses the action's real receipt as evidence for a completed event", () => {
    const items = { a1: action({ id: "a1", status: "completed", receipt: "Sent to hans@acme.de." }) };
    const out = buildTimeline([entry({ at: 1, actionId: "a1", event: "completed" })], items);
    expect(out[0].evidence).toBe("Sent to hans@acme.de.");
  });

  it("uses the action's real error as evidence for a failed event", () => {
    const items = { a1: action({ id: "a1", status: "failed", error: "401 invalid_grant" }) };
    const out = buildTimeline([entry({ at: 1, actionId: "a1", event: "failed" })], items);
    expect(out[0].evidence).toBe("401 invalid_grant");
  });

  it("falls back to the log entry's own detail when the action isn't in the current items map", () => {
    const out = buildTimeline(
      [entry({ at: 1, actionId: "ghost", event: "failed", detail: "unregistered executor" })],
      {}
    );
    expect(out[0].label).toBe("Failed: ghost");
    expect(out[0].evidence).toBe("unregistered executor");
  });

  it("never fabricates an event — an empty log produces an empty timeline", () => {
    expect(buildTimeline([], {})).toEqual([]);
  });
});

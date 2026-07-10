import { beforeEach, describe, expect, it } from "vitest";
import { computeMorningComplete } from "@/services/executors/morningComplete";
import { __clearRegistryForTests, registerExecutor } from "@/services/executors/registry";
import type { Action, Executor } from "@/services/executors/types";

function action(overrides: Partial<Action> & { id: string; executor: string; status: Action["status"] }): Action {
  return { params: {}, title: "t", createdAt: 0, ...overrides };
}

function fakeExecutor(id: string, label: string): Executor {
  return {
    id,
    label,
    mode: "native",
    undoStrategy: "pre-execute",
    undoWindowMs: 30_000,
    describe: () => ({ title: "t" }),
    execute: async () => ({ ok: true, receipt: "done" })
  };
}

beforeEach(() => {
  __clearRegistryForTests();
});

describe("computeMorningComplete", () => {
  it("returns null when nothing has ever been detected/prepared", () => {
    expect(computeMorningComplete({})).toBeNull();
  });

  it("returns null while anything is still pending a founder decision", () => {
    registerExecutor(fakeExecutor("gmail.send", "Send email"));
    const items = { a: action({ id: "a", executor: "gmail.send", status: "waiting_approval" }) };
    expect(computeMorningComplete(items)).toBeNull();
  });

  it("ignores 'detected'-only entries — background detection never blocks or fakes completion", () => {
    registerExecutor(fakeExecutor("gcal.move", "Move calendar event"));
    const items = { a: action({ id: "a", executor: "gcal.move", status: "detected" }) };
    expect(computeMorningComplete(items)).toBeNull();
  });

  it("summarizes completed actions per executor once everything real has resolved", () => {
    registerExecutor(fakeExecutor("gmail.send", "Send email"));
    registerExecutor(fakeExecutor("gcal.move", "Move calendar event"));
    const items: Record<string, Action> = {
      a: action({ id: "a", executor: "gmail.send", status: "completed" }),
      b: action({ id: "b", executor: "gmail.send", status: "completed" }),
      c: action({ id: "c", executor: "gcal.move", status: "completed" }),
      d: action({ id: "d", executor: "gmail.send", status: "cancelled" })
    };
    const summary = computeMorningComplete(items)!;
    expect(summary).not.toBeNull();
    expect(summary.totalResolved).toBe(4); // 3 completed + 1 cancelled
    expect(summary.failedCount).toBe(0);
    expect(summary.byExecutor).toEqual(
      expect.arrayContaining([
        { executor: "gmail.send", label: "Send email", completedCount: 2 },
        { executor: "gcal.move", label: "Move calendar event", completedCount: 1 }
      ])
    );
  });

  it("still reports complete with a failure count — never hides a failure inside a false all-clear", () => {
    registerExecutor(fakeExecutor("gmail.send", "Send email"));
    const items: Record<string, Action> = {
      a: action({ id: "a", executor: "gmail.send", status: "completed" }),
      b: action({ id: "b", executor: "gmail.send", status: "failed" })
    };
    const summary = computeMorningComplete(items)!;
    expect(summary.failedCount).toBe(1);
    expect(summary.totalResolved).toBe(1);
  });
});

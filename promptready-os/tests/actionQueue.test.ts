/**
 * Gmail MIME + Action Queue · fixture tests.
 *
 * Two concerns, no network:
 *  1. The RFC 2822 / base64url builder in gmailClient (the bytes Gmail
 *     receives).
 *  2. The generic Action Queue — the single execution primitive for
 *     the whole product — driving executors through detect → prepare
 *     → waiting_approval → executing → completed/failed, with undo,
 *     retry, and failure recovery. Fake clock + fake executors; the
 *     queue never imports a concrete executor module.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildRfc2822, encodeHeaderWord, toBase64Url } from "@/services/google/gmailClient";
import {
  useActionQueue,
  undoSecondsLeft,
  computeActionTiming,
  computeQueueMetrics,
  recoverOrphans
} from "@/services/executors/actionQueue";
import { __clearRegistryForTests, registerExecutor } from "@/services/executors/registry";
import type { Action, Executor } from "@/services/executors/types";

// ---------------------------------------------------------------------------
// MIME
// ---------------------------------------------------------------------------

describe("buildRfc2822", () => {
  it("builds From / To / Subject / body with CRLF separators", () => {
    const msg = buildRfc2822(
      { to: "hans@acme.de", subject: "Re: Tour", body: "Lieber Hans,\n\n— Tunç" },
      "me@operator.center"
    );
    expect(msg).toContain("From: me@operator.center");
    expect(msg).toContain("To: hans@acme.de");
    expect(msg).toContain("MIME-Version: 1.0");
    expect(msg).toContain('Content-Type: text/plain; charset="UTF-8"');
    expect(msg).toContain("Lieber Hans,");
    expect(msg).toContain("\r\n\r\n");
  });

  it("adds In-Reply-To / References when replying", () => {
    const msg = buildRfc2822(
      { to: "x@y.com", subject: "Re: x", body: "hi", inReplyTo: "<abc@mail>" },
      "me@op.center"
    );
    expect(msg).toContain("In-Reply-To: <abc@mail>");
    expect(msg).toContain("References: <abc@mail>");
  });

  it("RFC2047-encodes a non-ASCII subject", () => {
    const enc = encodeHeaderWord("Teklifiniz hazır · 18.400 €");
    expect(enc).toMatch(/^=\?UTF-8\?B\?.+\?=$/);
  });

  it("leaves an ASCII subject untouched", () => {
    expect(encodeHeaderWord("Re: Tour package")).toBe("Re: Tour package");
  });
});

describe("toBase64Url", () => {
  it("produces url-safe base64 with no padding", () => {
    const out = toBase64Url("hello>>>world???");
    expect(out).not.toContain("+");
    expect(out).not.toContain("/");
    expect(out).not.toContain("=");
  });

  it("round-trips UTF-8 content", () => {
    const out = toBase64Url("Avanos Halı · €8.400");
    const b64 = out.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = decodeURIComponent(escape(atob(b64)));
    expect(decoded).toContain("Avanos Halı");
    expect(decoded).toContain("€8.400");
  });
});

// ---------------------------------------------------------------------------
// Action queue · executor-agnostic
// ---------------------------------------------------------------------------

const PRE_EXECUTOR_ID = "test.pre";
const POST_EXECUTOR_ID = "test.post";

function makePreExecutor(overrides: Partial<Executor> = {}): Executor & { calls: unknown[] } {
  const calls: unknown[] = [];
  return {
    id: PRE_EXECUTOR_ID,
    label: "Test verb (pre-execute)",
    mode: "native",
    undoStrategy: "pre-execute",
    undoWindowMs: 30_000,
    describe: (p) => ({ title: `do ${(p as { name?: string }).name ?? "thing"}`, description: "detail" }),
    execute: async (p) => {
      calls.push(p);
      return { ok: true as const, receipt: "done it", ref: { x: 1 } };
    },
    calls,
    ...overrides
  };
}

function makePostExecutor(overrides: Partial<Executor> = {}): Executor & { calls: unknown[]; undoCalls: unknown[] } {
  const calls: unknown[] = [];
  const undoCalls: unknown[] = [];
  return {
    id: POST_EXECUTOR_ID,
    label: "Test verb (post-execute)",
    mode: "native",
    undoStrategy: "post-execute",
    undoWindowMs: 30_000,
    describe: () => ({ title: "post verb" }),
    execute: async (p) => {
      calls.push(p);
      return { ok: true as const, receipt: "done it" };
    },
    undo: async (p) => {
      undoCalls.push(p);
    },
    calls,
    undoCalls,
    ...overrides
  };
}

function prepareAndApprove(id: string, executorId: string, params: unknown = {}) {
  const q = useActionQueue.getState();
  q.prepare({ id, executor: executorId, params });
  q.approve(id);
}

beforeEach(() => {
  __clearRegistryForTests();
  useActionQueue.getState().reset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("prepare() → approve() → execute (pre-execute strategy)", () => {
  it("prepare() registers work as 'prepared', describe()'d, no undo window yet", () => {
    registerExecutor(makePreExecutor());
    useActionQueue.getState().prepare({ id: "a1", executor: PRE_EXECUTOR_ID, params: { name: "reply" } });
    const item = useActionQueue.getState().items["a1"];
    expect(item.status).toBe("prepared");
    expect(item.title).toBe("do reply");
    expect(item.description).toBe("detail");
    expect(item.undoUntil).toBeUndefined();
    expect(item.createdAt).toBeGreaterThan(0);
  });

  it("approve() starts the grace window; nothing executes until it elapses", () => {
    vi.useFakeTimers();
    const ex = makePreExecutor();
    registerExecutor(ex);
    prepareAndApprove("a1", PRE_EXECUTOR_ID, { name: "reply" });
    const item = useActionQueue.getState().items["a1"];
    expect(item.status).toBe("waiting_approval");
    expect(item.approvedAt).toBeGreaterThan(0);
    expect(undoSecondsLeft(item)).toBeGreaterThan(0);
    expect(ex.calls).toHaveLength(0);
  });

  it("executes after the grace window and records the receipt + ref", async () => {
    vi.useFakeTimers();
    const ex = makePreExecutor();
    registerExecutor(ex);
    prepareAndApprove("a1", PRE_EXECUTOR_ID, { name: "x" });
    await vi.advanceTimersByTimeAsync(30_000 + 10);
    const item = useActionQueue.getState().items["a1"];
    expect(ex.calls).toHaveLength(1);
    expect(item.status).toBe("completed");
    expect(item.receipt).toBe("done it");
    expect(item.ref).toEqual({ x: 1 });
    expect(item.executedAt).toBeGreaterThan(0);
    expect(item.completedAt).toBeGreaterThanOrEqual(item.executedAt!);
  });

  it("undo before the window elapses cancels — the executor never runs", async () => {
    vi.useFakeTimers();
    const ex = makePreExecutor();
    registerExecutor(ex);
    prepareAndApprove("a1", PRE_EXECUTOR_ID);
    useActionQueue.getState().undo("a1");
    await vi.advanceTimersByTimeAsync(30_000 + 50);
    expect(ex.calls).toHaveLength(0);
    expect(useActionQueue.getState().items["a1"].status).toBe("cancelled");
  });

  it("re-approving a cancelled action works — the founder can change their mind", async () => {
    vi.useFakeTimers();
    const ex = makePreExecutor();
    registerExecutor(ex);
    prepareAndApprove("a1", PRE_EXECUTOR_ID, { name: "reply" });
    useActionQueue.getState().undo("a1");
    expect(useActionQueue.getState().items["a1"].status).toBe("cancelled");

    useActionQueue.getState().approve("a1");
    expect(useActionQueue.getState().items["a1"].status).toBe("waiting_approval");
    await vi.advanceTimersByTimeAsync(30_000 + 10);
    expect(ex.calls).toHaveLength(1);
    expect(useActionQueue.getState().items["a1"].status).toBe("completed");
  });

  it("records failure when the executor returns ok:false", async () => {
    vi.useFakeTimers();
    registerExecutor(makePreExecutor({ execute: async () => ({ ok: false, error: "401 invalid_grant" }) }));
    prepareAndApprove("a1", PRE_EXECUTOR_ID);
    await vi.advanceTimersByTimeAsync(30_000 + 10);
    const item = useActionQueue.getState().items["a1"];
    expect(item.status).toBe("failed");
    expect(item.error).toContain("401");
  });

  it("records failure when the executor throws", async () => {
    vi.useFakeTimers();
    registerExecutor(
      makePreExecutor({
        execute: async () => {
          throw new Error("network down");
        }
      })
    );
    prepareAndApprove("a1", PRE_EXECUTOR_ID);
    await vi.advanceTimersByTimeAsync(30_000 + 10);
    expect(useActionQueue.getState().items["a1"].status).toBe("failed");
  });

  it("retry() re-attempts a failed action from scratch", async () => {
    vi.useFakeTimers();
    let attempt = 0;
    registerExecutor(
      makePreExecutor({
        execute: async () => {
          attempt++;
          return attempt === 1 ? { ok: false, error: "flaky" } : { ok: true, receipt: "ok now" };
        }
      })
    );
    prepareAndApprove("a1", PRE_EXECUTOR_ID);
    await vi.advanceTimersByTimeAsync(30_000 + 10);
    expect(useActionQueue.getState().items["a1"].status).toBe("failed");

    useActionQueue.getState().retry("a1");
    await vi.advanceTimersByTimeAsync(10);
    const item = useActionQueue.getState().items["a1"];
    expect(item.status).toBe("completed");
    expect(item.receipt).toBe("ok now");
    expect(item.retryCount).toBe(1);
  });

  it("automatically retries up to maxRetries before giving up", async () => {
    vi.useFakeTimers();
    let attempts = 0;
    registerExecutor(
      makePreExecutor({
        maxRetries: 2,
        execute: async () => {
          attempts++;
          return { ok: false, error: `attempt ${attempts} failed` };
        }
      })
    );
    prepareAndApprove("a1", PRE_EXECUTOR_ID);
    await vi.advanceTimersByTimeAsync(30_000 + 10);
    expect(attempts).toBe(3); // 1 initial + 2 retries
    const item = useActionQueue.getState().items["a1"];
    expect(item.status).toBe("failed");
    expect(item.retryCount).toBe(2);
  });

  it("approve() on a never-prepared id is a silent no-op", () => {
    registerExecutor(makePreExecutor());
    useActionQueue.getState().approve("ghost");
    expect(useActionQueue.getState().items["ghost"]).toBeUndefined();
  });

  it("prepare() creates no entry for an unregistered executor — never a phantom action", () => {
    useActionQueue.getState().prepare({ id: "a1", executor: "does.not.exist", params: {} });
    expect(useActionQueue.getState().items["a1"]).toBeUndefined();
  });

  it("surfaces an honest failure if the executor vanishes between prepare and the grace window firing", async () => {
    vi.useFakeTimers();
    registerExecutor(makePreExecutor());
    prepareAndApprove("a1", PRE_EXECUTOR_ID);
    __clearRegistryForTests(); // simulate the executor disappearing mid-flight
    await vi.advanceTimersByTimeAsync(30_000 + 10);
    const item = useActionQueue.getState().items["a1"];
    expect(item.status).toBe("failed");
    expect(item.error).toContain("No executor registered");
  });

  it("doneCount counts only completed actions", async () => {
    vi.useFakeTimers();
    registerExecutor(makePreExecutor());
    prepareAndApprove("a1", PRE_EXECUTOR_ID);
    prepareAndApprove("a2", PRE_EXECUTOR_ID);
    useActionQueue.getState().undo("a2");
    await vi.advanceTimersByTimeAsync(30_000 + 10);
    expect(useActionQueue.getState().doneCount()).toBe(1);
  });

  it("undoSecondsLeft returns 0 for a terminal item with no active window", () => {
    const done: Action = {
      id: "x",
      executor: PRE_EXECUTOR_ID,
      params: {},
      title: "t",
      status: "completed",
      createdAt: Date.now()
    };
    expect(undoSecondsLeft(done)).toBe(0);
  });
});

describe("post-execute undo strategy — a real compensating call", () => {
  it("executes immediately on approval (no pre-execute grace window)", async () => {
    vi.useFakeTimers();
    const ex = makePostExecutor();
    registerExecutor(ex);
    prepareAndApprove("a1", POST_EXECUTOR_ID);
    await vi.advanceTimersByTimeAsync(10);
    expect(ex.calls).toHaveLength(1);
    const item = useActionQueue.getState().items["a1"];
    expect(item.status).toBe("completed");
    expect(item.undoUntil).toBeGreaterThan(Date.now());
  });

  it("undo within the post-completion window calls the executor's real undo()", async () => {
    vi.useFakeTimers();
    const ex = makePostExecutor();
    registerExecutor(ex);
    prepareAndApprove("a1", POST_EXECUTOR_ID, { eventId: "e1" });
    await vi.advanceTimersByTimeAsync(10);

    useActionQueue.getState().undo("a1");
    await vi.advanceTimersByTimeAsync(10);
    expect(ex.undoCalls).toHaveLength(1);
    expect(useActionQueue.getState().items["a1"].status).toBe("undone");
  });

  it("undo outside the window is a no-op — never a fake reversal", async () => {
    vi.useFakeTimers();
    const ex = makePostExecutor();
    registerExecutor(ex);
    prepareAndApprove("a1", POST_EXECUTOR_ID);
    await vi.advanceTimersByTimeAsync(30_000 + 100);

    useActionQueue.getState().undo("a1");
    await vi.advanceTimersByTimeAsync(10);
    expect(ex.undoCalls).toHaveLength(0);
    expect(useActionQueue.getState().items["a1"].status).toBe("completed");
  });
});

const SILENT_EXECUTOR_ID = "test.silent";

function makeSilentExecutor(overrides: Partial<Executor> = {}): Executor & { calls: unknown[] } {
  const calls: unknown[] = [];
  return {
    id: SILENT_EXECUTOR_ID,
    label: "Test verb (silent)",
    mode: "native",
    undoStrategy: "post-execute",
    undoWindowMs: 30_000,
    requiresApproval: false,
    describe: () => ({ title: "silent verb" }),
    execute: async (p) => {
      calls.push(p);
      return { ok: true as const, receipt: "done silently" };
    },
    calls,
    ...overrides
  };
}

describe("silent executors — requiresApproval: false skips the founder decision", () => {
  it("prepare() auto-approves and runs immediately, tagging metadata.silent", async () => {
    vi.useFakeTimers();
    const ex = makeSilentExecutor();
    registerExecutor(ex);
    useActionQueue.getState().prepare({ id: "a1", executor: SILENT_EXECUTOR_ID, params: {} });
    await vi.advanceTimersByTimeAsync(10);
    const item = useActionQueue.getState().items["a1"];
    expect(item.status).toBe("completed");
    expect(item.metadata?.silent).toBe(true);
    expect(item.approvedAt).toBeGreaterThan(0);
    expect(ex.calls).toHaveLength(1);
  });

  it("still supports a real undo within the post-execute grace window", async () => {
    vi.useFakeTimers();
    const undoCalls: unknown[] = [];
    const ex = makeSilentExecutor({
      undo: async (p) => {
        undoCalls.push(p);
      }
    });
    registerExecutor(ex);
    useActionQueue.getState().prepare({ id: "a1", executor: SILENT_EXECUTOR_ID, params: { x: 1 } });
    await vi.advanceTimersByTimeAsync(10);
    useActionQueue.getState().undo("a1");
    await vi.advanceTimersByTimeAsync(10);
    expect(undoCalls).toHaveLength(1);
    expect(useActionQueue.getState().items["a1"].status).toBe("undone");
  });

  it("a non-silent executor's prepare() never auto-approves", () => {
    registerExecutor(makePreExecutor());
    useActionQueue.getState().prepare({ id: "a1", executor: PRE_EXECUTOR_ID, params: {} });
    expect(useActionQueue.getState().items["a1"].status).toBe("prepared");
    expect(useActionQueue.getState().items["a1"].metadata?.silent).toBeUndefined();
  });
});

describe("detect() → prepare() and reject()", () => {
  it("detect() registers a raw opportunity with no params yet", () => {
    useActionQueue.getState().detect({ id: "a1", executor: PRE_EXECUTOR_ID, title: "spotted something" });
    const item = useActionQueue.getState().items["a1"];
    expect(item.status).toBe("detected");
    expect(item.params).toBeUndefined();
  });

  it("prepare() promotes a detected item to prepared, keeping its createdAt", async () => {
    vi.useFakeTimers();
    registerExecutor(makePreExecutor());
    useActionQueue.getState().detect({ id: "a1", executor: PRE_EXECUTOR_ID, title: "spotted" });
    const detectedAt = useActionQueue.getState().items["a1"].createdAt;
    await vi.advanceTimersByTimeAsync(5_000);
    useActionQueue.getState().prepare({ id: "a1", executor: PRE_EXECUTOR_ID, params: { name: "x" } });
    const item = useActionQueue.getState().items["a1"];
    expect(item.status).toBe("prepared");
    expect(item.createdAt).toBe(detectedAt);
  });

  it("reject() declines a prepared item outright — nothing ever ran", () => {
    registerExecutor(makePreExecutor());
    useActionQueue.getState().prepare({ id: "a1", executor: PRE_EXECUTOR_ID, params: {} });
    useActionQueue.getState().reject("a1");
    expect(useActionQueue.getState().items["a1"].status).toBe("cancelled");
  });
});

describe("a pipeline re-run never clobbers a founder's decision", () => {
  it("prepare() after completion doesn't reset a completed action", async () => {
    vi.useFakeTimers();
    registerExecutor(makePreExecutor());
    prepareAndApprove("a1", PRE_EXECUTOR_ID, { name: "reply" });
    await vi.advanceTimersByTimeAsync(30_000 + 10);
    expect(useActionQueue.getState().items["a1"].status).toBe("completed");

    useActionQueue.getState().prepare({ id: "a1", executor: PRE_EXECUTOR_ID, params: { name: "reply v2" } });
    expect(useActionQueue.getState().items["a1"].status).toBe("completed");
  });
});

describe("approveAllPending() — one global gesture across every executor", () => {
  it("approves every prepared/waiting/cancelled action, across executors, and returns the count", async () => {
    vi.useFakeTimers();
    registerExecutor(makePreExecutor());
    registerExecutor(makePostExecutor());
    useActionQueue.getState().prepare({ id: "a1", executor: PRE_EXECUTOR_ID, params: { name: "x" } });
    useActionQueue.getState().prepare({ id: "a2", executor: POST_EXECUTOR_ID, params: {} });

    const count = useActionQueue.getState().approveAllPending();
    expect(count).toBe(2);
    expect(useActionQueue.getState().items["a1"].status).toBe("waiting_approval");

    await vi.advanceTimersByTimeAsync(30_000 + 10);
    expect(useActionQueue.getState().items["a1"].status).toBe("completed");
    expect(useActionQueue.getState().items["a2"].status).toBe("completed");
  });

  it("never touches actions that are already executing, completed, or genuinely done", () => {
    registerExecutor(makePreExecutor());
    const done: Action = { id: "done1", executor: PRE_EXECUTOR_ID, params: {}, title: "t", status: "completed", createdAt: 0 };
    useActionQueue.setState({ items: { done1: done }, order: ["done1"], log: [] });
    expect(useActionQueue.getState().approveAllPending()).toBe(0);
    expect(useActionQueue.getState().items["done1"].status).toBe("completed");
  });
});

describe("updateParams() — editing before a decision commits", () => {
  it("updates a prepared item's params and re-describes it", () => {
    registerExecutor(makePreExecutor());
    useActionQueue.getState().prepare({ id: "a1", executor: PRE_EXECUTOR_ID, params: { name: "draft" } });
    useActionQueue.getState().updateParams("a1", { name: "edited" });
    expect(useActionQueue.getState().items["a1"].title).toBe("do edited");
  });

  it("is a no-op once the item is in an active grace window (approvedAt set)", () => {
    vi.useFakeTimers();
    registerExecutor(makePreExecutor());
    prepareAndApprove("a1", PRE_EXECUTOR_ID, { name: "draft" });
    useActionQueue.getState().updateParams("a1", { name: "too late" });
    expect(useActionQueue.getState().items["a1"].title).toBe("do draft");
  });
});

describe("failure recovery — reload mid-flight is never silently trusted", () => {
  it("recoverOrphans marks an action stuck 'executing' as failed, never silently re-run or assumed done", () => {
    const orphan: Action = {
      id: "a1",
      executor: PRE_EXECUTOR_ID,
      params: {},
      title: "t",
      status: "executing",
      createdAt: Date.now(),
      executedAt: Date.now()
    };
    const recovered = recoverOrphans({ items: { a1: orphan }, order: ["a1"], log: [] });
    expect(recovered.items.a1.status).toBe("failed");
    expect(recovered.items.a1.error).toMatch(/interrupted/i);
    expect(recovered.log.some((l) => l.event === "recovered" && l.actionId === "a1")).toBe(true);
  });

  it("leaves everything else untouched — only genuinely orphaned 'executing' actions are affected", () => {
    const fine: Action = { id: "a2", executor: PRE_EXECUTOR_ID, params: {}, title: "t", status: "completed", createdAt: 0 };
    const recovered = recoverOrphans({ items: { a2: fine }, order: ["a2"], log: [] });
    expect(recovered.items.a2).toEqual(fine);
    expect(recovered.log).toHaveLength(0);
  });
});

describe("computeActionTiming", () => {
  it("computes timeToApprove, execution, and total durations", () => {
    const a: Action = {
      id: "a",
      executor: PRE_EXECUTOR_ID,
      params: {},
      title: "t",
      status: "completed",
      createdAt: 0,
      approvedAt: 100,
      executedAt: 200,
      completedAt: 500
    };
    const timing = computeActionTiming(a);
    expect(timing.timeToApproveMs).toBe(400);
    expect(timing.executionMs).toBe(300);
    expect(timing.totalMs).toBe(500);
  });

  it("returns nulls for an action still in flight", () => {
    const a: Action = { id: "a", executor: PRE_EXECUTOR_ID, params: {}, title: "t", status: "executing", createdAt: 0 };
    const timing = computeActionTiming(a);
    expect(timing.timeToApproveMs).toBeNull();
    expect(timing.executionMs).toBeNull();
    expect(timing.totalMs).toBeNull();
  });
});

describe("computeQueueMetrics", () => {
  it("aggregates by status, by executor, success rate, and retries", () => {
    const actions: Action[] = [
      { id: "a", executor: "gmail.send", params: {}, title: "t", status: "completed", createdAt: 0, executedAt: 0, completedAt: 100 },
      { id: "b", executor: "gmail.send", params: {}, title: "t", status: "failed", createdAt: 0, executedAt: 0, completedAt: 50, retryCount: 2 },
      { id: "c", executor: "gcal.move", params: {}, title: "t", status: "prepared", createdAt: 0 }
    ];
    const m = computeQueueMetrics(actions);
    expect(m.total).toBe(3);
    expect(m.byStatus.completed).toBe(1);
    expect(m.byStatus.failed).toBe(1);
    expect(m.byStatus.prepared).toBe(1);
    expect(m.byExecutor["gmail.send"]).toBe(2);
    expect(m.byExecutor["gcal.move"]).toBe(1);
    expect(m.successRate).toBeCloseTo(0.5, 5);
    expect(m.totalRetries).toBe(2);
    expect(m.medianExecutionMs).not.toBeNull();
  });

  it("successRate is null when nothing has completed or failed yet", () => {
    const actions: Action[] = [{ id: "a", executor: "gmail.send", params: {}, title: "t", status: "prepared", createdAt: 0 }];
    expect(computeQueueMetrics(actions).successRate).toBeNull();
  });
});

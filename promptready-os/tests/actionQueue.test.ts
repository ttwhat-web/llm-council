/**
 * Gmail MIME + executor action queue · fixture tests.
 *
 * Two concerns, no network:
 *  1. The RFC 2822 / base64url builder in gmailClient (the bytes Gmail
 *     receives).
 *  2. The generic action queue driving executors through approve →
 *     undo → execute → receipt, with a fake clock + fake executors.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildRfc2822,
  encodeHeaderWord,
  toBase64Url
} from "@/services/google/gmailClient";
import { useActionQueue, undoSecondsLeft } from "@/services/executors/actionQueue";
import {
  __clearRegistryForTests,
  registerExecutor
} from "@/services/executors/registry";
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

const TEST_EXECUTOR_ID = "test.verb";

function makeExecutor(overrides: Partial<Executor> = {}): Executor & { calls: unknown[] } {
  const calls: unknown[] = [];
  const ex: Executor & { calls: unknown[] } = {
    id: TEST_EXECUTOR_ID,
    label: "Test verb",
    mode: "native",
    undoWindowMs: 30_000,
    describe: (p) => ({ title: `do ${(p as { name?: string }).name ?? "thing"}`, detail: "detail" }),
    execute: async (p) => {
      calls.push(p);
      return { ok: true as const, receipt: "done it", ref: { x: 1 } };
    },
    calls,
    ...overrides
  };
  return ex;
}

beforeEach(() => {
  __clearRegistryForTests();
  useActionQueue.setState({ items: {}, order: [] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("action queue · approve → execute", () => {
  it("approve snapshots the executor's describe() into the action", () => {
    vi.useFakeTimers();
    registerExecutor(makeExecutor());
    useActionQueue.getState().approve({ id: "a1", executorId: TEST_EXECUTOR_ID, params: { name: "reply" } });
    const item = useActionQueue.getState().items["a1"];
    expect(item.status).toBe("queued");
    expect(item.title).toBe("do reply");
    expect(item.detail).toBe("detail");
    expect(undoSecondsLeft(item)).toBeGreaterThan(0);
  });

  it("executes after the undo window and records the receipt + ref", async () => {
    vi.useFakeTimers();
    const ex = makeExecutor();
    registerExecutor(ex);
    useActionQueue.getState().approve({ id: "a1", executorId: TEST_EXECUTOR_ID, params: { name: "x" } });
    await vi.advanceTimersByTimeAsync(30_000 + 10);
    const item = useActionQueue.getState().items["a1"];
    expect(ex.calls).toHaveLength(1);
    expect(item.status).toBe("done");
    expect(item.receipt).toBe("done it");
    expect(item.ref).toEqual({ x: 1 });
  });

  it("undo before the window cancels; the executor never runs", async () => {
    vi.useFakeTimers();
    const ex = makeExecutor();
    registerExecutor(ex);
    const q = useActionQueue.getState();
    q.approve({ id: "a1", executorId: TEST_EXECUTOR_ID, params: {} });
    q.undo("a1");
    await vi.advanceTimersByTimeAsync(30_000 + 50);
    expect(ex.calls).toHaveLength(0);
    expect(useActionQueue.getState().items["a1"].status).toBe("undone");
  });

  it("records an error when the executor returns ok:false", async () => {
    vi.useFakeTimers();
    registerExecutor(
      makeExecutor({ execute: async () => ({ ok: false, error: "401 invalid_grant" }) })
    );
    useActionQueue.getState().approve({ id: "a1", executorId: TEST_EXECUTOR_ID, params: {} });
    await vi.advanceTimersByTimeAsync(30_000 + 10);
    const item = useActionQueue.getState().items["a1"];
    expect(item.status).toBe("error");
    expect(item.error).toContain("401");
  });

  it("records an error when the executor throws", async () => {
    vi.useFakeTimers();
    registerExecutor(
      makeExecutor({
        execute: async () => {
          throw new Error("network down");
        }
      })
    );
    useActionQueue.getState().approve({ id: "a1", executorId: TEST_EXECUTOR_ID, params: {} });
    await vi.advanceTimersByTimeAsync(30_000 + 10);
    expect(useActionQueue.getState().items["a1"].status).toBe("error");
  });

  it("approving an unregistered executor fails honestly, never silently", () => {
    useActionQueue.getState().approve({ id: "a1", executorId: "does.not.exist", params: {} });
    const item = useActionQueue.getState().items["a1"];
    expect(item.status).toBe("error");
    expect(item.error).toContain("does.not.exist");
  });

  it("doneCount counts only successfully executed actions", async () => {
    vi.useFakeTimers();
    registerExecutor(makeExecutor());
    const q = useActionQueue.getState();
    q.approve({ id: "a1", executorId: TEST_EXECUTOR_ID, params: {} });
    q.approve({ id: "a2", executorId: TEST_EXECUTOR_ID, params: {} });
    q.undo("a2");
    await vi.advanceTimersByTimeAsync(30_000 + 10);
    expect(useActionQueue.getState().doneCount()).toBe(1);
  });

  it("undoSecondsLeft returns 0 for non-queued items", () => {
    const done: Action = {
      id: "x",
      executorId: TEST_EXECUTOR_ID,
      params: {},
      title: "t",
      status: "done"
    };
    expect(undoSecondsLeft(done)).toBe(0);
  });
});

/**
 * Send queue · fixture tests.
 *
 * Covers the MIME builder (so the bytes Gmail receives are correct)
 * and the approve → undo → send state machine with a fake clock and a
 * fake sender. No network.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildRfc2822,
  encodeHeaderWord,
  toBase64Url
} from "@/services/google/gmailClient";
import {
  __setSenderForTests,
  undoSecondsLeft,
  useSendQueueStore,
  UNDO_WINDOW_MS,
  type QueuedSend
} from "@/services/drafting/sendQueue";

afterEach(() => {
  vi.useRealTimers();
  // Reset the store between tests.
  useSendQueueStore.setState({ items: {}, order: [] });
});

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
    // headers separated from body by a blank CRLF line
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
    // decode back (atob is global in Node 18+ and the Tauri webview)
    const b64 = out.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = decodeURIComponent(escape(atob(b64)));
    expect(decoded).toContain("Avanos Halı");
    expect(decoded).toContain("€8.400");
  });
});

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

const sample = {
  id: "send-hans@acme.de",
  to: "hans@acme.de",
  subject: "Re: Tour",
  body: "Lieber Hans, …",
  threadId: "t1"
};

describe("send queue · approve → send", () => {
  it("approve enters the sending window with a countdown", () => {
    vi.useFakeTimers();
    const store = useSendQueueStore.getState();
    store.approve(sample);
    const item = useSendQueueStore.getState().items[sample.id];
    expect(item.status).toBe("sending");
    expect(undoSecondsLeft(item)).toBeGreaterThan(0);
    expect(undoSecondsLeft(item)).toBeLessThanOrEqual(30);
  });

  it("sends for real after the undo window elapses", async () => {
    vi.useFakeTimers();
    const sent: unknown[] = [];
    __setSenderForTests(async (input) => {
      sent.push(input);
      return { id: "gmail-123", threadId: "t1" };
    });
    useSendQueueStore.getState().approve(sample);
    await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS + 10);
    const item = useSendQueueStore.getState().items[sample.id];
    expect(sent).toHaveLength(1);
    expect(item.status).toBe("sent");
    expect(item.sentMessageId).toBe("gmail-123");
  });

  it("undo before the window cancels the send entirely", async () => {
    vi.useFakeTimers();
    let calls = 0;
    __setSenderForTests(async () => {
      calls++;
      return { id: "x", threadId: "t1" };
    });
    const store = useSendQueueStore.getState();
    store.approve(sample);
    store.undo(sample.id);
    await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS + 50);
    const item = useSendQueueStore.getState().items[sample.id];
    expect(item.status).toBe("undone");
    expect(calls).toBe(0); // never sent
  });

  it("records an error when the sender throws", async () => {
    vi.useFakeTimers();
    __setSenderForTests(async () => {
      throw new Error("401 invalid_grant");
    });
    useSendQueueStore.getState().approve(sample);
    await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS + 10);
    const item = useSendQueueStore.getState().items[sample.id];
    expect(item.status).toBe("error");
    expect(item.error).toContain("401");
  });

  it("undoSecondsLeft returns 0 for non-sending items", () => {
    const done: QueuedSend = { ...sample, status: "sent" };
    expect(undoSecondsLeft(done)).toBe(0);
  });
});

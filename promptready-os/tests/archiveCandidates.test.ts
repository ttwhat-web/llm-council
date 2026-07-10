import { describe, expect, it } from "vitest";
import { collectArchiveCandidates, MAX_ARCHIVE_PER_BATCH } from "@/services/drafting/archiveCandidates";
import type { GmailMessage, WorkspaceSnapshot } from "@/services/google/types";

const NOW = Date.UTC(2026, 5, 16, 8, 0, 0);

function msg(p: Partial<GmailMessage> & { id: string }): GmailMessage {
  return {
    id: p.id,
    threadId: p.threadId ?? `t-${p.id}`,
    date: p.date ?? NOW,
    fromName: p.fromName ?? "",
    fromAddress: (p.fromAddress ?? "noreply@service.com").toLowerCase(),
    toAddresses: p.toAddresses ?? ["me@operator.center"],
    subject: p.subject ?? "",
    snippet: p.snippet ?? "",
    isFromMe: p.isFromMe ?? false,
    isInInbox: p.isInInbox ?? true,
    isUnread: p.isUnread ?? false,
    labels: p.labels ?? []
  };
}

function snap(messages: GmailMessage[]): WorkspaceSnapshot {
  return { syncedAt: NOW, selfEmail: "me@operator.center", messages, threads: [], events: [], contacts: [] };
}

describe("collectArchiveCandidates", () => {
  it("returns null-safe empty array with no snapshot", () => {
    expect(collectArchiveCandidates(null)).toEqual([]);
  });

  it("includes an inbox message from a known automated sender", () => {
    const m = msg({ id: "m1", fromAddress: "noreply@service.com", fromName: "Service", subject: "Your receipt" });
    const out = collectArchiveCandidates(snap([m]));
    expect(out).toEqual([{ messageId: "m1", subject: "Your receipt", fromName: "Service" }]);
  });

  it("falls back to the address when there's no display name", () => {
    const m = msg({ id: "m1", fromAddress: "noreply@service.com", fromName: "" });
    const out = collectArchiveCandidates(snap([m]));
    expect(out[0].fromName).toBe("noreply@service.com");
  });

  it("excludes a message that isn't noise — a real customer sender", () => {
    const m = msg({ id: "m1", fromAddress: "hans@acme.de" });
    expect(collectArchiveCandidates(snap([m]))).toEqual([]);
  });

  it("excludes a message the founder sent", () => {
    const m = msg({ id: "m1", fromAddress: "noreply@service.com", isFromMe: true });
    expect(collectArchiveCandidates(snap([m]))).toEqual([]);
  });

  it("excludes a message that's already out of the inbox", () => {
    const m = msg({ id: "m1", fromAddress: "noreply@service.com", isInInbox: false });
    expect(collectArchiveCandidates(snap([m]))).toEqual([]);
  });

  it("caps at MAX_ARCHIVE_PER_BATCH", () => {
    const messages = Array.from({ length: MAX_ARCHIVE_PER_BATCH + 5 }, (_, i) =>
      msg({ id: `m${i}`, fromAddress: "noreply@service.com" })
    );
    expect(collectArchiveCandidates(snap(messages))).toHaveLength(MAX_ARCHIVE_PER_BATCH);
  });
});

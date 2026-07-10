import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/google/gmailClient", () => ({
  archiveMessage: vi.fn(),
  unarchiveMessage: vi.fn()
}));

import { archiveMessage, unarchiveMessage } from "@/services/google/gmailClient";
import { gmailArchiveExecutor } from "@/services/executors/gmailArchiveExecutor";

const mockArchive = vi.mocked(archiveMessage);
const mockUnarchive = vi.mocked(unarchiveMessage);

beforeEach(() => {
  mockArchive.mockReset();
  mockUnarchive.mockReset();
});

describe("gmailArchiveExecutor", () => {
  it("is a silent executor — requiresApproval is false", () => {
    expect(gmailArchiveExecutor.requiresApproval).toBe(false);
  });

  it("describe() shows the subject and sender for founder-facing display", () => {
    const desc = gmailArchiveExecutor.describe({ messageId: "m1", subject: "Weekly digest", fromName: "Acme News" });
    expect(desc?.title).toBe("Archive: Weekly digest");
    expect(desc?.description).toBe("Acme News");
  });

  it("describe() handles a missing subject honestly", () => {
    const desc = gmailArchiveExecutor.describe({ messageId: "m1", subject: "", fromName: "Acme News" });
    expect(desc?.title).toBe("Archive: (no subject)");
  });

  it("execute() archives via the real Gmail modify call and returns a receipt", async () => {
    mockArchive.mockResolvedValue(undefined);
    const result = await gmailArchiveExecutor.execute({ messageId: "m1", subject: "Weekly digest", fromName: "Acme News" });
    expect(mockArchive).toHaveBeenCalledWith("m1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.receipt).toContain("Weekly digest");
      expect(result.ref).toEqual({ messageId: "m1" });
    }
  });

  it("execute() surfaces a real failure instead of a fake success", async () => {
    mockArchive.mockRejectedValue(new Error("Gmail modify failed (403)"));
    const result = await gmailArchiveExecutor.execute({ messageId: "m1", subject: "x", fromName: "y" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("403");
  });

  it("undo() re-adds the INBOX label — a real compensating call", async () => {
    mockUnarchive.mockResolvedValue(undefined);
    await gmailArchiveExecutor.undo?.({ messageId: "m1", subject: "x", fromName: "y" }, { messageId: "m1" });
    expect(mockUnarchive).toHaveBeenCalledWith("m1");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/serverAgentBridge", () => ({
  bridgeRestart: vi.fn()
}));

import { bridgeRestart } from "@/services/serverAgentBridge";
import { computerUseExecutor } from "@/services/executors/computerUseExecutor";
import type { ServerProfile } from "@/store/servers";

const mockBridgeRestart = vi.mocked(bridgeRestart);

function profile(overrides: Partial<ServerProfile> = {}): ServerProfile {
  return {
    id: "srv-1",
    name: "Juan's VPS",
    host: "juan-vps.example.com",
    sshUser: "deploy",
    port: 22,
    tags: [],
    allowedPm2Apps: ["api"],
    allowedDockerContainers: [],
    allowedSystemdServices: [],
    createdAt: 0,
    ...overrides
  };
}

beforeEach(() => {
  mockBridgeRestart.mockReset();
});

describe("computerUseExecutor · identity and safety defaults", () => {
  it("never offers an undo — every action here is genuinely irreversible", () => {
    expect(computerUseExecutor.undoStrategy).toBe("none");
    expect(computerUseExecutor.undo).toBeUndefined();
  });

  it("never overrides requiresApproval to false — always stops for a founder decision", () => {
    expect(computerUseExecutor.requiresApproval).not.toBe(false);
  });
});

describe("computerUseExecutor · describe() renders the mandatory approval checkpoint", () => {
  it("shows the exact real target, never a vague summary", () => {
    const desc = computerUseExecutor.describe({
      capability: "terminal",
      summary: "Restart the api service",
      target: "juan-vps.example.com · pm2:api",
      terminal: { profile: profile(), kind: "pm2", serviceName: "api" }
    });
    expect(desc.title).toBe("Restart the api service");
    expect(desc.description).toBe("juan-vps.example.com · pm2:api");
  });
});

describe("computerUseExecutor · terminal capability (real, via the existing SSH bridge)", () => {
  it("restarts the exact named service and returns a real receipt", async () => {
    mockBridgeRestart.mockResolvedValue({
      ok: true,
      data: { restarted: true, stdout: "api restarted\n", stderr: "" },
      command: "restart",
      started_at_ms: 0,
      duration_ms: 12
    });
    const result = await computerUseExecutor.execute({
      capability: "terminal",
      summary: "Restart the api service",
      target: "juan-vps.example.com · pm2:api",
      terminal: { profile: profile(), kind: "pm2", serviceName: "api" }
    });
    expect(mockBridgeRestart).toHaveBeenCalledWith(expect.objectContaining({ host: "juan-vps.example.com" }), "pm2", "api");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.receipt).toContain("Restarted api");
      expect(result.ref).toEqual({ host: "juan-vps.example.com", kind: "pm2", name: "api" });
    }
  });

  it("surfaces a real failure instead of a fake success", async () => {
    mockBridgeRestart.mockResolvedValue({
      ok: false,
      data: null,
      error: "'api' not in pm2 allowlist for this profile",
      command: "restart",
      started_at_ms: 0,
      duration_ms: 3
    });
    const result = await computerUseExecutor.execute({
      capability: "terminal",
      summary: "Restart the api service",
      target: "juan-vps.example.com · pm2:api",
      terminal: { profile: profile(), kind: "pm2", serviceName: "api" }
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("allowlist");
  });

  it("refuses to act with no server target specified, rather than guessing", async () => {
    const result = await computerUseExecutor.execute({
      capability: "terminal",
      summary: "Restart the api service",
      target: "juan-vps.example.com · pm2:api"
    });
    expect(result.ok).toBe(false);
    expect(mockBridgeRestart).not.toHaveBeenCalled();
  });
});

describe("computerUseExecutor · capabilities not wired up yet", () => {
  it("browser: honestly refuses instead of pretending to work", async () => {
    const result = await computerUseExecutor.execute({
      capability: "browser",
      summary: "Compare Mac Studio prices",
      target: "amazon.com"
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("isn't wired up yet");
    expect(mockBridgeRestart).not.toHaveBeenCalled();
  });

  it("desktop: honestly refuses instead of pretending to work", async () => {
    const result = await computerUseExecutor.execute({ capability: "desktop", summary: "Open Finder", target: "desktop" });
    expect(result.ok).toBe(false);
  });

  it("vision: honestly refuses instead of pretending to work", async () => {
    const result = await computerUseExecutor.execute({ capability: "vision", summary: "Read the screen", target: "screen" });
    expect(result.ok).toBe(false);
  });
});

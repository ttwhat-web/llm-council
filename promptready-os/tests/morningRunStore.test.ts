/**
 * Morning Run state · idle → running → completed | failed.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMorningRunStore } from "@/store/morningRun";

vi.mock("@/services/morningRun/orchestrator", () => ({
  runMorningRun: vi.fn()
}));

import { runMorningRun } from "@/services/morningRun/orchestrator";

const mockRunMorningRun = vi.mocked(runMorningRun);

beforeEach(() => {
  useMorningRunStore.setState({ status: "idle", lastRun: null });
  mockRunMorningRun.mockReset();
});

describe("useMorningRunStore", () => {
  it("goes idle → running → completed on a normal run", async () => {
    mockRunMorningRun.mockResolvedValue({
      startedAt: 0,
      durationMs: 42,
      detectorsFired: ["stale-customer-thread"],
      draftsGenerated: 2,
      actionsPrepared: 2,
      executorCount: 1,
      aiTokens: 500,
      aiLatencyMs: 300,
      errors: [],
      operatorRead: "Good morning."
    });

    expect(useMorningRunStore.getState().status).toBe("idle");
    const promise = useMorningRunStore.getState().run();
    expect(useMorningRunStore.getState().status).toBe("running");
    await promise;
    expect(useMorningRunStore.getState().status).toBe("completed");
    expect(useMorningRunStore.getState().lastRun?.draftsGenerated).toBe(2);
  });

  it("a summary with per-item errors is still 'completed', not 'failed' — graceful degradation", async () => {
    mockRunMorningRun.mockResolvedValue({
      startedAt: 0,
      durationMs: 10,
      detectorsFired: [],
      draftsGenerated: 1,
      actionsPrepared: 1,
      executorCount: 1,
      aiTokens: 10,
      aiLatencyMs: 5,
      errors: ["Draft for x@y.com: Anthropic 500"],
      operatorRead: null
    });
    await useMorningRunStore.getState().run();
    expect(useMorningRunStore.getState().status).toBe("completed");
  });

  it("goes 'failed' only when the orchestrator itself throws", async () => {
    mockRunMorningRun.mockRejectedValue(new Error("unexpected crash"));
    await useMorningRunStore.getState().run();
    expect(useMorningRunStore.getState().status).toBe("failed");
    expect(useMorningRunStore.getState().lastRun?.errors).toContain("unexpected crash");
  });

  it("refuses to start a second run while one is already running", async () => {
    let resolveFirst!: (v: unknown) => void;
    mockRunMorningRun.mockReturnValue(
      new Promise((resolve) => {
        resolveFirst = resolve;
      }) as ReturnType<typeof runMorningRun>
    );

    const first = useMorningRunStore.getState().run();
    const second = await useMorningRunStore.getState().run();
    expect(second).toBeNull(); // second call is a no-op while running

    resolveFirst({
      startedAt: 0,
      durationMs: 1,
      detectorsFired: [],
      draftsGenerated: 0,
      actionsPrepared: 0,
      executorCount: 0,
      aiTokens: 0,
      aiLatencyMs: 0,
      errors: [],
      operatorRead: null
    });
    await first;
    expect(mockRunMorningRun).toHaveBeenCalledTimes(1);
  });
});

/**
 * Acceptance test · "Adding a Browser executor should require only
 * registering it. Nothing else."
 *
 * This is a hypothetical Browser executor that has never existed
 * anywhere else in the codebase. It exercises the full detect →
 * prepare → approve → execute → completed lifecycle using ONLY the
 * public Executor/registry/queue surface — proving the queue and
 * registry genuinely never need to know a "browser" verb exists.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { useActionQueue } from "@/services/executors/actionQueue";
import { __clearRegistryForTests, registerExecutor, getExecutor } from "@/services/executors/registry";
import type { Executor } from "@/services/executors/types";

interface BrowserFillFormParams {
  url: string;
  formFields: Record<string, string>;
}

const BROWSER_FILL_FORM_ID = "browser.fillForm";

const browserFillFormExecutor: Executor<BrowserFillFormParams> = {
  id: BROWSER_FILL_FORM_ID,
  label: "Fill web form",
  mode: "computer-use",
  undoStrategy: "none", // once submitted through a legacy portal, there's no real reversal
  undoWindowMs: 0,
  describe(params) {
    return { title: `Fill form at ${new URL(params.url).hostname}`, confidence: 70, priority: "medium" };
  },
  async execute(params) {
    return { ok: true, receipt: `Submitted form on ${new URL(params.url).hostname}.`, ref: { fieldCount: Object.keys(params.formFields).length } };
  }
};

beforeEach(() => {
  __clearRegistryForTests();
  useActionQueue.getState().reset();
});

describe("acceptance · Browser executor requires only registration", () => {
  it("registers and resolves through the same registry as every other executor", () => {
    registerExecutor(browserFillFormExecutor);
    expect(getExecutor(BROWSER_FILL_FORM_ID)).toBe(browserFillFormExecutor);
  });

  it("flows through detect → prepare → approve → execute → completed with zero queue changes", async () => {
    vi.useFakeTimers();
    registerExecutor(browserFillFormExecutor);
    const q = useActionQueue.getState();

    q.detect({ id: "b1", executor: BROWSER_FILL_FORM_ID, title: "Found a form to fill" });
    expect(q.get("b1")?.status).toBe("detected");

    q.prepare({
      id: "b1",
      executor: BROWSER_FILL_FORM_ID,
      params: { url: "https://legacy-portal.example.com/apply", formFields: { name: "Acme Corp" } }
    });
    const prepared = q.get("b1")!;
    expect(prepared.status).toBe("prepared");
    expect(prepared.title).toBe("Fill form at legacy-portal.example.com");
    expect(prepared.confidence).toBe(70);

    // Undo strategy "none" — irreversible, so undoWindowMs is 0 and
    // execute() should run essentially immediately on approval.
    q.approve("b1");
    await vi.advanceTimersByTimeAsync(10);

    const completed = q.get("b1")!;
    expect(completed.status).toBe("completed");
    expect(completed.receipt).toBe("Submitted form on legacy-portal.example.com.");
    expect(completed.ref).toEqual({ fieldCount: 1 });

    // Irreversible by design — undo is a no-op, never a fake reversal.
    q.undo("b1");
    expect(q.get("b1")!.status).toBe("completed");
  });

  it("the founder-facing description never leaks 'browser' or implementation detail", () => {
    registerExecutor(browserFillFormExecutor);
    const desc = browserFillFormExecutor.describe({
      url: "https://portal.example.com",
      formFields: {}
    });
    expect(desc.title.toLowerCase()).not.toContain("browser");
    expect(desc.title.toLowerCase()).not.toContain("computer-use");
    expect(desc.title.toLowerCase()).not.toContain("executor");
  });
});

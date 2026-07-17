/**
 * Computer Use · one executor, several capabilities.
 *
 * Operator's "hands" — the executor for verbs that don't have a
 * documented API, driving a real surface directly instead. One
 * executor, not six: `capability` picks which real surface an action
 * touches, so the Action Queue, approval chrome, and Timeline never
 * need to know or care which one it was — same principle as
 * Executor.mode already establishes (native vs. computer-use is
 * metadata, never a UI branch).
 *
 * Today only `terminal` is real — it drives the existing, already
 * security-reviewed Tauri SSH bridge (services/serverAgentBridge.ts):
 * strict per-profile allowlists, key-based auth only, no shell
 * injection, every call audited. `browser`/`desktop`/`vision` are
 * declared here (so params/approval/Timeline never need to change
 * when they land) but honestly refuse to run — driving a real browser
 * or desktop from this app requires a native bridge process this
 * repo doesn't have yet (Playwright/OS automation can't run inside a
 * Tauri webview), and pretending otherwise would be a fake capability.
 *
 * Every action here is genuinely irreversible (a restarted service
 * can't be un-restarted, a submitted form can't be un-submitted) —
 * undoStrategy is always "none", and requiresApproval is never
 * overridden to false: this is the one class of executor that must
 * always stop at a founder decision before it touches anything real.
 */

import { bridgeRestart, type ServiceKind } from "@/services/serverAgentBridge";
import type { ServerProfile } from "@/store/servers";
import type { Executor } from "./types";

export const COMPUTER_USE_EXECUTOR_ID = "computer.use";

export type ComputerUseCapability = "terminal" | "browser" | "desktop" | "vision";

export interface TerminalAction {
  profile: ServerProfile;
  kind: ServiceKind;
  serviceName: string;
}

export interface ComputerUseParams {
  capability: ComputerUseCapability;
  /** Plain, founder-facing description of the action itself, e.g.
   *  "Restart the api service". Never a technical label. */
  summary: string;
  /** The exact real target this touches — host, account, site —
   *  shown at the approval checkpoint. Never invented. */
  target: string;
  terminal?: TerminalAction;
}

const CAPABILITY_UNAVAILABLE: Record<Exclude<ComputerUseCapability, "terminal">, string> = {
  browser: "Browser automation isn't wired up yet — only Terminal actions are available today.",
  desktop: "Desktop automation isn't wired up yet — only Terminal actions are available today.",
  vision: "Screen reading isn't wired up yet — only Terminal actions are available today."
};

export const computerUseExecutor: Executor<ComputerUseParams> = {
  id: COMPUTER_USE_EXECUTOR_ID,
  label: "Computer use",
  mode: "computer-use",
  // A restarted service, a submitted form, a completed purchase — none
  // of this has a real compensating action. Honesty means never
  // offering an undo button that would do nothing.
  undoStrategy: "none",
  undoWindowMs: 0,

  describe(params) {
    return { title: params.summary, description: params.target };
  },

  async execute(params) {
    if (params.capability !== "terminal") {
      return { ok: false, error: CAPABILITY_UNAVAILABLE[params.capability] };
    }
    const action = params.terminal;
    if (!action) {
      return { ok: false, error: "No server target was specified for this action." };
    }
    const result = await bridgeRestart(action.profile, action.kind, action.serviceName);
    if (!result.ok) {
      return { ok: false, error: result.error ?? "Restart failed." };
    }
    const firstLine = result.data?.stdout?.split("\n")[0]?.trim();
    return {
      ok: true,
      receipt: firstLine ? `Restarted ${action.serviceName}. ${firstLine}` : `Restarted ${action.serviceName}.`,
      ref: { host: action.profile.host, kind: action.kind, name: action.serviceName }
    };
  }
};

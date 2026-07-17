/**
 * Executors · boot. Importing this module registers every built-in
 * executor into the registry. The app imports it once at startup so
 * the action queue can resolve verbs by id.
 *
 * Adding a capability later (calendar move, WhatsApp send, Stripe
 * charge, a computer-use browser task) = one more registerExecutor
 * call here. No UI, no routing, no swarm config.
 */

import { registerExecutor } from "./registry";
import { gmailSendExecutor } from "./gmailSendExecutor";
import { calendarMoveExecutor } from "./calendarMoveExecutor";
import { gmailArchiveExecutor } from "./gmailArchiveExecutor";
import { computerUseExecutor } from "./computerUseExecutor";

let booted = false;

export function bootExecutors(): void {
  if (booted) return;
  booted = true;
  registerExecutor(gmailSendExecutor);
  registerExecutor(calendarMoveExecutor);
  registerExecutor(gmailArchiveExecutor);
  registerExecutor(computerUseExecutor);
  // Future:
  //   registerExecutor(whatsappSendExecutor);    // native or computer-use
  //   registerExecutor(stripeChargeExecutor);    // native · Stripe
}

export { GMAIL_SEND_EXECUTOR_ID } from "./gmailSendExecutor";
export { CALENDAR_MOVE_EXECUTOR_ID, type CalendarMoveParams } from "./calendarMoveExecutor";
export { GMAIL_ARCHIVE_EXECUTOR_ID, type GmailArchiveParams } from "./gmailArchiveExecutor";
export {
  COMPUTER_USE_EXECUTOR_ID,
  type ComputerUseParams,
  type ComputerUseCapability,
  type TerminalAction
} from "./computerUseExecutor";
export { useActionQueue, undoSecondsLeft } from "./actionQueue";
export type { ApproveInput } from "./actionQueue";
export { computeQueueMetrics, computeActionTiming } from "./actionMetrics";
export { buildTimeline, type TimelineEntry } from "./timeline";
export { computeMorningComplete, type MorningCompleteSummary } from "./morningComplete";
export * from "./types";

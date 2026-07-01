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

let booted = false;

export function bootExecutors(): void {
  if (booted) return;
  booted = true;
  registerExecutor(gmailSendExecutor);
  registerExecutor(calendarMoveExecutor);
  // Future:
  //   registerExecutor(whatsappSendExecutor);    // native or computer-use
  //   registerExecutor(stripeChargeExecutor);    // native · Stripe
  //   registerExecutor(browserTaskExecutor);     // computer-use · any portal
}

export { GMAIL_SEND_EXECUTOR_ID } from "./gmailSendExecutor";
export { CALENDAR_MOVE_EXECUTOR_ID, type CalendarMoveParams } from "./calendarMoveExecutor";
export { useActionQueue, undoSecondsLeft } from "./actionQueue";
export type { ApproveInput } from "./actionQueue";
export * from "./types";

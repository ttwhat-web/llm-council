/**
 * Runtime Shield · Sprint A
 *
 * Local-only policy gates for REMOTE actions. The Telegram command
 * parser (and any future mobile-companion command surface) checks
 * `isRemoteAllowed(action)` before mutating runtime state.
 *
 * Defaults are conservative:
 *   · receipt           · allowed (read-only)
 *   · inbox-capture     · allowed (additive, reversible)
 *   · run               · denied
 *   · approve           · denied
 *   · pause-resume      · denied
 *
 * Every toggle flip is audit-logged. Every blocked command is too.
 */

import { auditLog } from "@/services/auditLog";

export type ShieldAction =
  | "run"
  | "approve"
  | "pause-resume"
  | "receipt"
  | "inbox-capture";

export interface ShieldState {
  run: boolean;
  approve: boolean;
  pauseResume: boolean;
  receipt: boolean;
  inboxCapture: boolean;
}

const DEFAULTS: ShieldState = {
  run: false,
  approve: false,
  pauseResume: false,
  receipt: true,
  inboxCapture: true
};

const STORAGE_KEY = "promptready-os.runtime-shield";

export function readShield(): ShieldState {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<ShieldState>) };
  } catch {
    return DEFAULTS;
  }
}

function writeShield(s: ShieldState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

export function setShield(action: ShieldAction, value: boolean) {
  const next = { ...readShield() };
  const k = keyOf(action);
  next[k] = value;
  writeShield(next);
  auditLog("policy.toggle", { key: `shield.${action}`, on: value });
}

export function isRemoteAllowed(action: ShieldAction): boolean {
  return readShield()[keyOf(action)] === true;
}

function keyOf(action: ShieldAction): keyof ShieldState {
  switch (action) {
    case "run":
      return "run";
    case "approve":
      return "approve";
    case "pause-resume":
      return "pauseResume";
    case "receipt":
      return "receipt";
    case "inbox-capture":
      return "inboxCapture";
  }
}

/** Log a blocked command attempt. Caller passes the command verb. */
export function auditBlocked(verb: string, action: ShieldAction) {
  auditLog("policy.toggle", {
    key: "shield.blocked",
    verb,
    action,
    on: false
  });
}

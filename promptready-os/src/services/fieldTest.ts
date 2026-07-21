/**
 * Field Test Mode · Sprint D · Section G
 *
 * A single local toggle that surfaces extra debug logging + panels. It
 * is purely additive: nothing about mission execution, providers, or
 * stores changes when it is on. The flag persists under localStorage so
 * a field operator can leave it on across reloads.
 */

const KEY = "promptready-os.field-test";

export function isFieldTestMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setFieldTestMode(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (on) window.localStorage.setItem(KEY, "1");
    else window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function fieldLog(tag: string, detail?: unknown): void {
  if (typeof window === "undefined") return;
  if (!isFieldTestMode()) return;
  if (detail === undefined) console.log("[field-test] " + tag);
  else console.log("[field-test] " + tag, detail);
}

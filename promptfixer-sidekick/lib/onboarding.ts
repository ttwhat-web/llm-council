/**
 * First-run onboarding state.
 *
 * The five-slide wizard at `/app` checks this on mount. Operators who
 * skip or finish flip the flag; subsequent visits skip the wizard.
 * Storage is per-browser — moving to a new device replays the
 * onboarding once.
 *
 * Storage layout:
 *   pf.onboarding.v1.completed = "true" | absent
 */

"use client";

const KEY = "pf.onboarding.v1.completed";

export function hasCompletedOnboarding(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(KEY) === "true";
  } catch {
    return true;
  }
}

export function markOnboardingComplete(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, "true");
  } catch {
    /* ignore */
  }
}

export function resetOnboarding(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Billing · trial math (no store, pure).
 */

import { describe, expect, it } from "vitest";
import { computeTrialStatus, TRIAL_LENGTH_DAYS } from "@/store/billing";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("computeTrialStatus", () => {
  it("is active on day 0", () => {
    const now = 1_000_000;
    const s = computeTrialStatus(now, false, now);
    expect(s.daysElapsed).toBe(0);
    expect(s.daysRemaining).toBe(TRIAL_LENGTH_DAYS);
    expect(s.isActive).toBe(true);
    expect(s.isExpired).toBe(false);
  });

  it("floors partial days", () => {
    const startedAt = 0;
    const now = 2.5 * DAY_MS;
    const s = computeTrialStatus(startedAt, false, now);
    expect(s.daysElapsed).toBe(2);
    expect(s.daysRemaining).toBe(TRIAL_LENGTH_DAYS - 2);
  });

  it("stays active up through the last day of the window", () => {
    const startedAt = 0;
    const now = (TRIAL_LENGTH_DAYS - 1) * DAY_MS;
    const s = computeTrialStatus(startedAt, false, now);
    expect(s.isActive).toBe(true);
    expect(s.isExpired).toBe(false);
    expect(s.daysRemaining).toBe(1);
  });

  it("expires once the window has fully elapsed", () => {
    const startedAt = 0;
    const now = TRIAL_LENGTH_DAYS * DAY_MS;
    const s = computeTrialStatus(startedAt, false, now);
    expect(s.isActive).toBe(false);
    expect(s.isExpired).toBe(true);
    expect(s.daysRemaining).toBe(0);
  });

  it("never expires once upgraded, regardless of elapsed time", () => {
    const startedAt = 0;
    const now = 90 * DAY_MS;
    const s = computeTrialStatus(startedAt, true, now);
    expect(s.isActive).toBe(true);
    expect(s.isExpired).toBe(false);
  });

  it("clamps negative elapsed time (clock skew) to day 0", () => {
    const startedAt = 10_000;
    const now = 0;
    const s = computeTrialStatus(startedAt, false, now);
    expect(s.daysElapsed).toBe(0);
    expect(s.isExpired).toBe(false);
  });
});

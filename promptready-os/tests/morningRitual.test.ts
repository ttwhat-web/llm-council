/**
 * Morning Ritual store · account-scoped "seen" + per-day banner dedupe.
 *
 * These tests run in Node (no `window`), same as every other store
 * test in this suite — the store's own readJsonMap/writeJsonMap
 * helpers already no-op without a real `window.localStorage` (the
 * same SSR-safety guard used everywhere else in this codebase), so
 * what's under test here is the in-memory account/date logic, not
 * disk persistence itself.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { useMorningRitualStore, localDateKey } from "@/store/morningRitual";

beforeEach(() => {
  useMorningRitualStore.setState({
    seenByAccount: {},
    legacySeenDevice: false,
    dailyBannerDateByAccount: {}
  });
});

describe("useMorningRitualStore · First Morning, account-scoped", () => {
  it("has not been seen for a fresh account", () => {
    expect(useMorningRitualStore.getState().hasSeenFirstMorning("hans@bridgeco.example")).toBe(false);
  });

  it("marks only the account it was told about, not every account on the device", () => {
    useMorningRitualStore.getState().markFirstMorningSeen("hans@bridgeco.example");
    expect(useMorningRitualStore.getState().hasSeenFirstMorning("hans@bridgeco.example")).toBe(true);
    expect(useMorningRitualStore.getState().hasSeenFirstMorning("klein@bridgeco.example")).toBe(false);
  });

  it("is case-insensitive on the account key", () => {
    useMorningRitualStore.getState().markFirstMorningSeen("Hans@BridgeCo.example");
    expect(useMorningRitualStore.getState().hasSeenFirstMorning("hans@bridgeco.example")).toBe(true);
  });

  it("grandfathers in a device that already saw the pre-account-scoping flag", () => {
    useMorningRitualStore.setState({ legacySeenDevice: true });
    expect(useMorningRitualStore.getState().hasSeenFirstMorning("brand-new-account@example.com")).toBe(true);
  });

  it("falls back to a shared bucket when no email is known yet, rather than crashing", () => {
    useMorningRitualStore.getState().markFirstMorningSeen(null);
    expect(useMorningRitualStore.getState().hasSeenFirstMorning(null)).toBe(true);
  });
});

describe("useMorningRitualStore · Daily Morning, once per calendar day per account", () => {
  it("has not fired today for a fresh account", () => {
    const today = localDateKey(new Date());
    expect(useMorningRitualStore.getState().hasSeenDailyBannerToday("hans@bridgeco.example", today)).toBe(false);
  });

  it("marking it shown today doesn't mark it shown for a different day", () => {
    const today = localDateKey(new Date(2026, 5, 16));
    const tomorrow = localDateKey(new Date(2026, 5, 17));
    useMorningRitualStore.getState().markDailyBannerShown("hans@bridgeco.example", today);
    expect(useMorningRitualStore.getState().hasSeenDailyBannerToday("hans@bridgeco.example", today)).toBe(true);
    expect(useMorningRitualStore.getState().hasSeenDailyBannerToday("hans@bridgeco.example", tomorrow)).toBe(false);
  });

  it("tracks each account's daily banner independently", () => {
    const today = localDateKey(new Date());
    useMorningRitualStore.getState().markDailyBannerShown("hans@bridgeco.example", today);
    expect(useMorningRitualStore.getState().hasSeenDailyBannerToday("klein@bridgeco.example", today)).toBe(false);
  });
});

describe("localDateKey", () => {
  it("formats as YYYY-MM-DD in local time", () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(localDateKey(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});

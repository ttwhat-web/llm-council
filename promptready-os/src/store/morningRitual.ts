"use client";

/**
 * Morning Ritual · what's been shown, to which account, and when.
 *
 * Two independent things are tracked:
 *  1. Has THIS Google account ever seen the big, cinematic First
 *     Morning ceremony? (Once per account, not once per device — see
 *     the honesty note below.)
 *  2. Has the terse Daily Morning banner already fired today, for
 *     this account? (Once per calendar day, so background re-syncs
 *     during the same day never repeat it.)
 *
 * Honesty note on "account-scoped": this is still localStorage under
 * the hood — Operator has no server-side account system today (BYOK,
 * local-only, per CLAUDE.md). Scoping the flag by the connected
 * Google email fixes the two things that ARE fixable without a
 * backend: reconnecting the same account on the same machine never
 * replays it, and a second Google account on the same device gets its
 * own first-morning moment instead of inheriting the first account's.
 * A genuinely new machine still doesn't know what a previous machine
 * saw — that requires a real account/cloud layer, which doesn't
 * exist yet. Don't claim otherwise.
 *
 * Anyone who already saw the old device-wide flag is grandfathered in
 * (never replayed just because this file changed shape).
 */

import { create } from "zustand";

const SEEN_MAP_KEY = "operator.morningRitual.seenByAccount.v1";
const LEGACY_SEEN_KEY = "operator.morningRitual.seen";
const DAILY_MAP_KEY = "operator.morningRitual.dailyBannerDateByAccount.v1";

function readJsonMap(key: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeJsonMap(key: string, map: Record<string, string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(map));
  } catch {
    // ignore
  }
}

function readLegacySeen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(LEGACY_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

/** Stable key for an account: the lowercased email, or a fixed
 *  fallback bucket on the rare occasion no email is known yet — the
 *  same honest degrade the old device-wide flag already was. */
function accountKey(email: string | null): string {
  return email ? email.trim().toLowerCase() : "_unknown_";
}

/** "2026-07-21" in the founder's local time zone — a calendar day,
 *  not a rolling 24h window, so the banner logic matches how a human
 *  thinks about "today" vs "yesterday". */
export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface MorningRitualState {
  seenByAccount: Record<string, string>; // account key -> ISO timestamp first seen
  legacySeenDevice: boolean;
  dailyBannerDateByAccount: Record<string, string>; // account key -> last date shown

  hasSeenFirstMorning(email: string | null): boolean;
  markFirstMorningSeen(email: string | null): void;
  /** The calendar day (local time) First Morning was marked seen for
   *  this account, or null if never / legacy-grandfathered (no real
   *  timestamp exists for the legacy flag, so the Daily banner just
   *  falls back to its normal per-day gate in that case). Lets the
   *  Daily banner skip the same day the ceremony already ran on. */
  firstMorningSeenDateKey(email: string | null): string | null;

  hasSeenDailyBannerToday(email: string | null, todayKey: string): boolean;
  markDailyBannerShown(email: string | null, todayKey: string): void;
}

export const useMorningRitualStore = create<MorningRitualState>((set, get) => ({
  seenByAccount: readJsonMap(SEEN_MAP_KEY),
  legacySeenDevice: readLegacySeen(),
  dailyBannerDateByAccount: readJsonMap(DAILY_MAP_KEY),

  hasSeenFirstMorning(email) {
    const { seenByAccount, legacySeenDevice } = get();
    if (legacySeenDevice) return true;
    return !!seenByAccount[accountKey(email)];
  },

  markFirstMorningSeen(email) {
    const next = { ...get().seenByAccount, [accountKey(email)]: new Date().toISOString() };
    writeJsonMap(SEEN_MAP_KEY, next);
    set({ seenByAccount: next });
  },

  firstMorningSeenDateKey(email) {
    const iso = get().seenByAccount[accountKey(email)];
    if (!iso) return null;
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? null : localDateKey(parsed);
  },

  hasSeenDailyBannerToday(email, todayKey) {
    return get().dailyBannerDateByAccount[accountKey(email)] === todayKey;
  },

  markDailyBannerShown(email, todayKey) {
    const next = { ...get().dailyBannerDateByAccount, [accountKey(email)]: todayKey };
    writeJsonMap(DAILY_MAP_KEY, next);
    set({ dailyBannerDateByAccount: next });
  }
}));

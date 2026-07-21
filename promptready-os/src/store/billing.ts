"use client";

/**
 * Billing · trial + upgrade, no backend required.
 *
 * Operator has no server, so there is no webhook and no verified
 * payment state — the trial clock and the "upgraded" flag both live
 * in localStorage on this device. The founder pastes their own Stripe
 * Payment Link into Settings (no code change, no proxy, no deploy),
 * opens it to pay, then confirms manually. This is the same honesty
 * rule as everywhere else in Operator: it never pretends to know
 * something it can't actually see.
 *
 * Trial starts the first time this store is ever read (first app
 * launch) and runs TRIAL_LENGTH_DAYS. Expiry gates the paid action
 * loop (sending replies) — reading the briefing stays free so the
 * founder keeps seeing the value while deciding to upgrade.
 */

import { create } from "zustand";

export const TRIAL_LENGTH_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

const STORAGE_KEY_STARTED = "operator.billing.v0.trialStartedAt";
const STORAGE_KEY_UPGRADED = "operator.billing.v0.upgraded";
const STORAGE_KEY_LINK = "operator.billing.v0.paymentLinkUrl";

export interface TrialStatus {
  daysElapsed: number;
  /** floor(0..TRIAL_LENGTH_DAYS) · 0 once expired. */
  daysRemaining: number;
  /** true when upgraded, or still inside the trial window. */
  isActive: boolean;
  /** true only when the trial window has passed and not upgraded. */
  isExpired: boolean;
}

/** Pure · trial math, no store, no clock reads. */
export function computeTrialStatus(startedAt: number, upgraded: boolean, now: number): TrialStatus {
  const elapsedMs = Math.max(0, now - startedAt);
  const daysElapsed = Math.floor(elapsedMs / DAY_MS);
  const daysRemaining = Math.max(0, TRIAL_LENGTH_DAYS - daysElapsed);
  const isExpired = !upgraded && daysElapsed >= TRIAL_LENGTH_DAYS;
  return { daysElapsed, daysRemaining, isActive: !isExpired, isExpired };
}

function readStartedAt(): number {
  if (typeof window === "undefined") return Date.now();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_STARTED);
    if (raw) {
      const n = Number(raw);
      if (Number.isFinite(n)) return n;
    }
  } catch {
    return Date.now();
  }
  // First read ever · the trial clock starts now.
  const now = Date.now();
  try {
    window.localStorage.setItem(STORAGE_KEY_STARTED, String(now));
  } catch {
    /* quota */
  }
  return now;
}

function readUpgraded(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY_UPGRADED) === "1";
  } catch {
    return false;
  }
}

function readPaymentLink(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY_LINK);
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

interface BillingState {
  startedAt: number;
  upgraded: boolean;
  paymentLinkUrl: string | null;
  status(now?: number): TrialStatus;
  /** Founder self-attests payment after using the Payment Link. No webhook exists to verify this automatically. */
  confirmUpgrade(): void;
  setPaymentLinkUrl(url: string | null): void;
}

export const useBillingStore = create<BillingState>((set, get) => ({
  startedAt: readStartedAt(),
  upgraded: readUpgraded(),
  paymentLinkUrl: readPaymentLink(),

  status(now = Date.now()) {
    const { startedAt, upgraded } = get();
    return computeTrialStatus(startedAt, upgraded, now);
  },

  confirmUpgrade() {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY_UPGRADED, "1");
      } catch {
        /* quota */
      }
    }
    set({ upgraded: true });
  },

  setPaymentLinkUrl(url) {
    const trimmed = url?.trim() || null;
    if (typeof window !== "undefined") {
      try {
        if (trimmed) window.localStorage.setItem(STORAGE_KEY_LINK, trimmed);
        else window.localStorage.removeItem(STORAGE_KEY_LINK);
      } catch {
        /* quota */
      }
    }
    set({ paymentLinkUrl: trimmed });
  }
}));

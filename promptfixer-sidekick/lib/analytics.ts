/**
 * Analytics adapter.
 *
 * Single function `track(event, props?)` the rest of the app calls. The
 * default backend is a no-op that logs to the dev console. When
 * `NEXT_PUBLIC_POSTHOG_KEY` is configured at build time, the same
 * function defers to `posthog-js` (loaded lazily so the bundle stays
 * thin when analytics is off).
 *
 * Server-side imports are safe — `track()` is a no-op outside the
 * browser, with the same shape, so route handlers can call it
 * defensively without branching.
 *
 * Event taxonomy (typed for completeness; pass extra props freely):
 *   mission_run            { mode, modelQuality, ms, score? }
 *   mission_saved          { id, visibility }
 *   mission_shared         { id }
 *   stack_saved            { mode }
 *   workflow_recorded      { stepCount }
 *   upgrade_modal_opened   { reason }
 *   checkout_started       { plan, mode }
 *   checkout_success       { plan, source }
 */

"use client";

export type AnalyticsEvent =
  | "mission_run"
  | "mission_saved"
  | "mission_shared"
  | "stack_saved"
  | "workflow_recorded"
  | "upgrade_modal_opened"
  | "checkout_started"
  | "checkout_success";

export interface AnalyticsProps {
  [key: string]: string | number | boolean | null | undefined;
}

// PostHog is loaded lazily — undefined until the first call when keys
// are configured. We capture in-flight events and replay on init.
let phPromise: Promise<unknown> | null = null;
let posthog: { capture: (event: string, props?: AnalyticsProps) => void } | null = null;
const queue: Array<[AnalyticsEvent, AnalyticsProps]> = [];

const KEY =
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_POSTHOG_KEY : undefined;
const HOST =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_HOST) ||
  "https://us.i.posthog.com";

function ensurePostHog(): void {
  if (typeof window === "undefined") return;
  if (!KEY) return;
  if (posthog || phPromise) return;
  phPromise = import("posthog-js")
    .then((mod) => {
      const ph = mod.default;
      ph.init(KEY, {
        api_host: HOST,
        capture_pageview: true,
        capture_pageleave: true,
        autocapture: false,
        person_profiles: "identified_only"
      });
      posthog = { capture: (event, props) => ph.capture(event, props) };
      // Flush queue.
      while (queue.length) {
        const [e, p] = queue.shift()!;
        posthog.capture(e, p);
      }
    })
    .catch(() => {
      // Posthog unavailable — keep no-op semantics.
      phPromise = null;
    });
}

export function track(event: AnalyticsEvent, props: AnalyticsProps = {}): void {
  // Browser: try PostHog when configured.
  if (typeof window !== "undefined" && KEY) {
    ensurePostHog();
    if (posthog) {
      posthog.capture(event, props);
    } else {
      queue.push([event, props]);
    }
    return;
  }
  // Server-side, dev, or no key: log + no-op. Keeps the call site
  // unchanged across environments.
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.debug(`[analytics] ${event}`, props);
  }
}

/**
 * Identify the current user. Called by the AnalyticsProvider once we
 * know the Clerk user id or session fingerprint. Safe to call
 * repeatedly — PostHog dedupes.
 */
export function identify(userKey: string, traits: AnalyticsProps = {}): void {
  if (typeof window === "undefined" || !KEY) return;
  ensurePostHog();
  void phPromise?.then(() => {
    void import("posthog-js").then((mod) => {
      mod.default.identify(userKey, traits);
    });
  });
}

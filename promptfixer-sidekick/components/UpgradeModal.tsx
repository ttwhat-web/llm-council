"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { Check, Crown, ShieldCheck, X } from "lucide-react";
import { BILLING_PLANS, type BillingTier } from "@/lib/billing";

/**
 * Upgrade paywall + plan picker.
 *
 * Phase-4: every Pro/Team flow goes through `/api/billing/checkout`.
 * The server returns either:
 *
 *   - `{ ok: true, mode: "stub" }` and signs a dev-override cookie. The
 *     UI then re-fetches `/api/billing/me`, which returns
 *     `source: "dev-override"`. The card shows a "Local preview" badge.
 *   - `{ ok: true, mode: "stripe", url }` (future) — we'd redirect.
 *   - An error envelope `{ ok: false, code, message }` — we surface it
 *     inline.
 *
 * The Phase-3 client-only Pro flag (`lib/billing.ts → loadTier`) is
 * still used as a soft fallback for first paint and for environments
 * where the API is unreachable.
 */

interface ServerSnapshot {
  source: "auth" | "dev-override" | "default";
  mode: "stub" | "stripe" | "paddle";
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Local fallback tier (used when server isn't reached). */
  tier: BillingTier;
  onTierChange: (tier: BillingTier) => void;
  /** Optional server billing snapshot to render verification state. */
  serverSnapshot?: ServerSnapshot | null;
  /** Reload server billing after a successful checkout call. */
  onCheckoutComplete?: () => void;
  reason?: "limit-reached" | "manage";
}

export function UpgradeModal({
  open,
  onClose,
  tier,
  onTierChange,
  serverSnapshot,
  onCheckoutComplete,
  reason
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const callCheckout = async (plan: BillingTier) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan })
      });
      const data = (await res.json()) as {
        ok: boolean;
        plan?: BillingTier;
        mode?: string;
        message?: string;
        code?: string;
        nextAction?: string;
      };
      if (!res.ok || !data.ok) {
        const msg = data.message || data.code || `Checkout failed (${res.status})`;
        setError(msg);
        // Soft-fall back to local Pro Preview only if server explicitly
        // refused to configure billing AND the user is asking for Pro.
        if (
          plan === "pro" &&
          (data.code === "checkout_unavailable" || data.code === "billing_not_configured")
        ) {
          onTierChange("pro");
        }
        return;
      }
      // Server accepted — sync local fallback so reloads stay coherent.
      onTierChange(plan);
      onCheckoutComplete?.();
      if (plan !== "free") onClose();
    } catch (err) {
      // Server unreachable — degrade to local preview so demos still work.
      setError(
        `Server checkout failed (${(err as Error).message}). Falling back to local preview.`
      );
      onTierChange(plan === "free" ? "free" : "pro");
    } finally {
      setBusy(false);
    }
  };

  const verified = serverSnapshot?.source === "auth";
  const localPreview = serverSnapshot?.source === "dev-override" || tier === "pro";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            key="dialog"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-bg/95 p-5 shadow-glass"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 rounded-md p-1 text-white/55 transition hover:bg-white/8 hover:text-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <header className="mb-4 flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
                {reason === "limit-reached" ? "Daily limit reached" : "Plans"}
              </span>
              <h2 className="text-lg font-semibold text-white">
                {reason === "limit-reached"
                  ? "You've used today's free fixes"
                  : "PromptFixer plans"}
              </h2>
              <p className="text-[12px] text-white/55">
                {reason === "limit-reached"
                  ? "The free tier ships with 10 fixes per day. Upgrade for unlimited fixes, saved stacks, recorded workflows, and exports."
                  : "Pick the plan that matches how you work. Real billing isn't enforced yet — switching to Pro applies a server-signed local preview cookie."}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {verified && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-emerald-200">
                    <ShieldCheck className="h-3 w-3" /> Server verified
                  </span>
                )}
                {!verified && localPreview && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-200">
                    Local preview
                  </span>
                )}
                {serverSnapshot && (
                  <span className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/50">
                    mode: {serverSnapshot.mode}
                  </span>
                )}
              </div>
            </header>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {BILLING_PLANS.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  active={
                    (plan.id === "pro" && tier === "pro") ||
                    (plan.id === "free" && tier === "free")
                  }
                  busy={busy}
                  onPick={() => {
                    if (plan.id === "team") {
                      // Team has no stub flow — surface "talk to us".
                      window.open("mailto:hello@promptfixer.app?subject=Team%20plan", "_blank");
                      return;
                    }
                    void callCheckout(plan.id === "pro" ? "pro" : "free");
                  }}
                />
              ))}
            </div>

            {error && (
              <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                {error}
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col">
                <span className="text-[12px] font-medium text-white/85">
                  Local Pro Preview (fallback)
                </span>
                <span className="text-[11px] text-white/50">
                  Flips the client-only flag without contacting the server. Use when the
                  checkout endpoint isn&apos;t reachable. No payment is processed.
                </span>
              </div>
              <button
                type="button"
                onClick={() => onTierChange(tier === "pro" ? "free" : "pro")}
                className={clsx(
                  "no-drag inline-flex items-center justify-center gap-2 rounded-xl px-3 py-1.5 text-[12px] font-semibold transition",
                  tier === "pro"
                    ? "border border-white/15 bg-white/[0.06] text-white/85 hover:bg-white/[0.1]"
                    : "border border-accent/40 bg-accent/[0.08] text-accent hover:bg-accent/[0.16]"
                )}
              >
                <Crown className="h-3.5 w-3.5" />
                {tier === "pro" ? "Disable local preview" : "Enable local preview"}
              </button>
            </div>

            <p className="mt-3 text-[10px] text-white/35">
              Real Stripe / Paddle integration lands next phase. The Pro plan today
              applies a server-signed dev cookie when {`BILLING_DEV_OVERRIDE_SECRET`} is set,
              or a localStorage flag otherwise — both are clearly tagged as previews.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PlanCard({
  plan,
  active,
  busy,
  onPick
}: {
  plan: (typeof BILLING_PLANS)[number];
  active?: boolean;
  busy?: boolean;
  onPick: () => void;
}) {
  const isTeam = plan.id === "team";
  return (
    <div
      className={clsx(
        "flex flex-col gap-2 rounded-2xl border bg-white/[0.02] p-4 transition",
        plan.highlight
          ? "border-accent/35 shadow-glow"
          : active
            ? "border-emerald-400/35"
            : "border-white/8"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">{plan.name}</span>
        <span className="text-xs text-white/65">{plan.price}</span>
      </div>
      {active && (
        <span className="inline-flex w-fit items-center gap-1 rounded-md border border-emerald-400/35 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-emerald-200">
          <Check className="h-3 w-3" /> active
        </span>
      )}
      <ul className="mt-1 flex flex-col gap-1.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[12px] text-white/80">
            <Check
              className={clsx(
                "mt-0.5 h-3.5 w-3.5 shrink-0",
                plan.highlight ? "text-accent" : "text-white/55"
              )}
            />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onPick}
        disabled={busy}
        className={clsx(
          "no-drag mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
          plan.highlight
            ? "bg-accent/90 text-white shadow-glow hover:bg-accent"
            : isTeam
              ? "border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]"
              : "border border-white/10 bg-white/[0.03] text-white/85 hover:bg-white/[0.06]"
        )}
      >
        {plan.id === "free" ? "Use Free" : isTeam ? "Talk to us" : "Use Pro Preview"}
      </button>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { Check, Crown, X } from "lucide-react";
import { BILLING_PLANS, type BillingTier } from "@/lib/billing";

/**
 * Upgrade paywall + plan picker.
 *
 * Renders three plan cards (Free / Pro / Team) with the locked feature
 * bullets the rest of the UI maps onto. Below the cards is a dev-only
 * "Enable Pro Preview" toggle that flips the local tier without any
 * payment. This is explicitly labelled — no real billing yet.
 *
 * Mounted by PromptFixer when the user hits the free limit, or via the
 * Usage chip click. Caller controls open state and tier mutation.
 */

interface Props {
  open: boolean;
  onClose: () => void;
  tier: BillingTier;
  onTierChange: (tier: BillingTier) => void;
  /** Why was the modal triggered? Drives the headline copy. */
  reason?: "limit-reached" | "manage";
}

export function UpgradeModal({ open, onClose, tier, onTierChange, reason }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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
                  : "Pick the plan that matches how you work. Real billing isn't enforced yet — flip the Pro Preview to unlock everything in this build."}
              </p>
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
                />
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col">
                <span className="text-[12px] font-medium text-white/85">
                  Enable Pro Preview
                </span>
                <span className="text-[11px] text-white/50">
                  Local-only toggle. Unlocks Pro features in this build for evaluation.
                  No payment is processed.
                </span>
              </div>
              <button
                type="button"
                onClick={() => onTierChange(tier === "pro" ? "free" : "pro")}
                className={clsx(
                  "no-drag inline-flex items-center justify-center gap-2 rounded-xl px-3 py-1.5 text-[12px] font-semibold transition",
                  tier === "pro"
                    ? "border border-white/15 bg-white/[0.06] text-white/85 hover:bg-white/[0.1]"
                    : "bg-accent/90 text-white shadow-glow hover:bg-accent"
                )}
              >
                <Crown className="h-3.5 w-3.5" />
                {tier === "pro" ? "Disable Pro Preview" : "Enable Pro Preview"}
              </button>
            </div>

            <p className="mt-3 text-[10px] text-white/35">
              Real Stripe / Paddle integration lands in the next phase. Until then
              the Pro flag is durable in localStorage and gates only client-side UI.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PlanCard({
  plan,
  active
}: {
  plan: (typeof BILLING_PLANS)[number];
  active?: boolean;
}) {
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
    </div>
  );
}

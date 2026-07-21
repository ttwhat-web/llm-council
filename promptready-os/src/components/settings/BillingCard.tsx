"use client";

/**
 * Billing · trial status + upgrade.
 *
 * No backend, no webhook — so this card can't verify a payment on its
 * own. It opens your Stripe Payment Link in the browser. Self-confirm
 * ("I've completed payment") is a manual override with NO verification
 * behind it, so it is gated to Developer Mode only and labelled BETA.
 * This is not production billing — real upgrade state must come from a
 * Stripe webhook or a verified Checkout Session before public release.
 */

import { useState } from "react";
import { CreditCard, ExternalLink } from "lucide-react";
import { useBillingStore, TRIAL_LENGTH_DAYS } from "@/store/billing";

export function BillingCard({ devMode }: { devMode: boolean }) {
  const paymentLinkUrl = useBillingStore((s) => s.paymentLinkUrl);
  const setPaymentLinkUrl = useBillingStore((s) => s.setPaymentLinkUrl);
  const confirmUpgrade = useBillingStore((s) => s.confirmUpgrade);
  const upgraded = useBillingStore((s) => s.upgraded);
  const status = useBillingStore((s) => s.status());

  const [linkInput, setLinkInput] = useState(paymentLinkUrl ?? "");

  const onSaveLink = () => {
    setPaymentLinkUrl(linkInput);
  };

  const onOpenLink = () => {
    if (!paymentLinkUrl) return;
    window.open(paymentLinkUrl, "_blank", "noopener,noreferrer");
  };

  const onConfirm = () => {
    if (!confirm("Confirm you've completed payment? This unlocks Operator on this device.")) return;
    confirmUpgrade();
  };

  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-white/[0.025] p-5">
      <header className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-[0.15em] text-white/40">Billing</span>
        <h2 className="text-[18px] font-semibold tracking-tight text-white">
          <CreditCard className="mr-2 inline h-4 w-4 -translate-y-px text-white/65" />
          Trial &amp; upgrade
        </h2>
      </header>

      {/* Status */}
      <div className="rounded-xl bg-white/[0.02] px-4 py-3">
        {upgraded ? (
          <p className="text-[13.5px] font-medium text-emerald-200">
            Upgraded · thank you. Operator keeps working, no limits.
          </p>
        ) : status.isExpired ? (
          <p className="text-[13.5px] font-medium text-amber-200">
            Trial ended. Sending replies is paused until you upgrade — the
            briefing keeps working.
          </p>
        ) : (
          <p className="text-[13.5px] font-medium text-white">
            Trial · day {status.daysElapsed + 1} of {TRIAL_LENGTH_DAYS} ·{" "}
            {status.daysRemaining} day{status.daysRemaining === 1 ? "" : "s"} left
          </p>
        )}
      </div>

      {!upgraded && (
        <>
          {/* Payment link — pasted by the founder, no code change needed. */}
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/40">
              Stripe Payment Link
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="url"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="https://buy.stripe.com/…"
                autoComplete="off"
                className="no-drag flex-1 rounded-md border border-white/8 bg-white/[0.025] px-2 py-1.5 text-[12px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
              />
              <button
                type="button"
                onClick={onSaveLink}
                disabled={linkInput.trim() === (paymentLinkUrl ?? "")}
                className="inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent/[0.08] px-2 py-1.5 text-[10.5px] text-accent transition hover:bg-accent/[0.15] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Save
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-white/45">
              Create a Payment Link in your Stripe dashboard and paste it here.
              No proxy, no code change — this device opens it directly.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onOpenLink}
              disabled={!paymentLinkUrl}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/45"
              title={paymentLinkUrl ? "Opens your Stripe Payment Link" : "Paste a Payment Link above first"}
            >
              <ExternalLink className="h-3.5 w-3.5" /> Upgrade
            </button>
          </div>

          {devMode ? (
            <div className="flex flex-col gap-2 rounded-lg border border-amber-400/20 bg-amber-500/[0.05] px-3 py-2.5">
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-amber-500/[0.15] px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-amber-200">
                Beta · unverified
              </span>
              <p className="text-[11.5px] leading-relaxed text-amber-100/80">
                No webhook exists yet to verify a real payment. This button
                only flips a local flag on this device — do not treat it as
                production billing.
              </p>
              <button
                type="button"
                onClick={onConfirm}
                className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5 text-[12px] font-medium text-white/85 transition hover:bg-white/[0.08]"
              >
                I&apos;ve completed payment (beta override)
              </button>
            </div>
          ) : (
            <p className="text-[11px] leading-relaxed text-white/40">
              Automatic unlock after payment isn&apos;t live yet — it ships with
              Stripe webhook verification. Enable Developer Mode below for a
              manual, unverified beta override.
            </p>
          )}
        </>
      )}
    </section>
  );
}

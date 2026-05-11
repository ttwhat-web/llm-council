"use client";

import { useEffect, useState } from "react";
import { Bitcoin, CreditCard, Landmark, Loader2, ShieldCheck } from "lucide-react";
import type {
  ManualInstructions,
  PaymentPlanKey,
  PaymentProviderId,
  ProviderInfo
} from "@/lib/payments/types";
import { track } from "@/lib/analytics";

/**
 * PaymentsPicker — the Phase-8 multi-provider surface.
 *
 * Fetches `/api/payments/providers` on mount, renders enabled providers
 * (excluding `stripe`, which the existing UpgradeModal already handles
 * directly), and dispatches to `/api/payments/checkout`. For
 * redirect-based providers, the browser navigates to the returned URL.
 * For crypto / local manual flows, a `<CryptoInstructions />` panel
 * surfaces inline with a tx-hash submit form.
 */

interface FounderSnapshot {
  cap: number;
  claimed: number;
  remaining: number;
  soldOut: boolean;
}

interface ProvidersResponse {
  ok: boolean;
  providers: ProviderInfo[];
  founder: FounderSnapshot;
  crypto: { enabled: boolean; networks: Array<{ id: string; label: string; asset: string }> };
}

interface Props {
  plan: PaymentPlanKey;
}

export function PaymentsPicker({ plan }: Props) {
  const [data, setData] = useState<ProvidersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyProvider, setBusyProvider] = useState<PaymentProviderId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<{
    paymentId: string;
    provider: PaymentProviderId;
    instructions: ManualInstructions;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/payments/providers", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: ProvidersResponse) => {
        if (cancelled) return;
        setData(d);
        // Auto-select first network so crypto checkout has a default.
        if (d.crypto.networks[0]) setSelectedNetwork(d.crypto.networks[0].id);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const callCheckout = async (provider: PaymentProviderId) => {
    setBusyProvider(provider);
    setError(null);
    track("checkout_started", { plan, provider });
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          plan,
          ...(provider === "crypto_manual" && selectedNetwork
            ? { cryptoNetwork: selectedNetwork }
            : {})
        })
      });
      const d = (await res.json()) as {
        ok: boolean;
        mode?: string;
        redirectUrl?: string;
        manualInstructions?: ManualInstructions;
        paymentId?: string;
        provider?: PaymentProviderId;
        message?: string;
        code?: string;
      };
      if (!res.ok || !d.ok) {
        setError(d.message || d.code || `Checkout failed (${res.status}).`);
        return;
      }
      if (d.redirectUrl) {
        window.location.assign(d.redirectUrl);
        return;
      }
      if (d.manualInstructions && d.paymentId && d.provider) {
        setInstructions({
          paymentId: d.paymentId,
          provider: d.provider,
          instructions: d.manualInstructions
        });
        return;
      }
      setError("Provider returned no actionable response.");
    } catch (err) {
      setError(`Checkout failed: ${(err as Error).message}`);
    } finally {
      setBusyProvider(null);
    }
  };

  if (loading) {
    return (
      <div className="mt-4 inline-flex items-center gap-2 text-[12px] text-white/55">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading payment methods…
      </div>
    );
  }
  if (!data) {
    return (
      <div className="mt-4 rounded-md border border-amber-400/35 bg-amber-500/[0.08] px-3 py-2 text-[12px] text-amber-200">
        Couldn&apos;t load payment providers.
      </div>
    );
  }

  // Hide Stripe + stub here — the legacy UpgradeModal flow already
  // handles those. PaymentsPicker surfaces alternatives: Paddle / Lemon
  // / crypto / local bank transfer.
  const altProviders = data.providers.filter(
    (p) => p.id !== "stripe" && p.id !== "stub"
  );

  if (instructions) {
    return (
      <CryptoInstructions
        paymentId={instructions.paymentId}
        provider={instructions.provider}
        instructions={instructions.instructions}
        onReset={() => setInstructions(null)}
      />
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">
          alternative payment methods
        </span>
        <p className="text-[11px] text-white/55">
          Card (Stripe) is offered in the plan cards above. The methods below
          route through merchant-of-record providers, on-chain crypto, or
          manual bank transfer.
        </p>
        {data.founder.soldOut ? (
          <span className="inline-flex w-fit items-center gap-1 rounded-md border border-rose-400/40 bg-rose-500/[0.08] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-rose-200">
            Founder lifetime · sold out · {data.founder.claimed}/{data.founder.cap}
          </span>
        ) : (
          <span className="inline-flex w-fit items-center gap-1 rounded-md border border-amber-400/35 bg-amber-500/[0.08] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-200">
            <ShieldCheck className="h-3 w-3" />
            founder lifetime · {data.founder.claimed}/{data.founder.cap} claimed
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {altProviders.map((p) => {
          const supports = p.plans.includes(plan);
          const Icon = iconFor(p.id);
          const disabled = !p.enabled || !supports;
          return (
            <div
              key={p.id}
              className={`flex flex-col gap-2 rounded-2xl border p-3 ${
                disabled
                  ? "border-white/8 bg-white/[0.012] opacity-70"
                  : "border-white/10 bg-white/[0.02] hover:border-accent/30"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-accent" />
                <span className="text-[13px] font-semibold text-white">{p.label}</span>
              </div>
              <p className="text-[11px] text-white/55">{p.description}</p>
              {!p.enabled && p.unavailableReason && (
                <p className="text-[10px] text-amber-200">{p.unavailableReason}</p>
              )}
              {p.enabled && !supports && (
                <p className="text-[10px] text-white/45">
                  {p.label} does not currently accept {plan.replace(/_/g, " ")}.
                </p>
              )}
              {p.id === "crypto_manual" && data.crypto.networks.length > 0 && (
                <label className="mt-1 flex flex-col gap-1 text-[11px] text-white/65">
                  Network
                  <select
                    value={selectedNetwork ?? ""}
                    onChange={(e) => setSelectedNetwork(e.target.value)}
                    className="no-drag rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[11px] text-white"
                  >
                    {data.crypto.networks.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <button
                type="button"
                disabled={disabled || busyProvider !== null}
                onClick={() => void callCheckout(p.id)}
                className={`mt-1 inline-flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  p.manualVerification
                    ? "border-amber-400/40 bg-amber-500/[0.08] text-amber-200 hover:bg-amber-500/[0.14]"
                    : "border-accent/30 bg-accent/[0.08] text-accent hover:bg-accent/[0.16]"
                }`}
              >
                {busyProvider === p.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : null}
                {p.manualVerification ? "Start manual checkout" : "Continue"}
              </button>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="rounded-md border border-amber-400/40 bg-amber-500/[0.08] px-2.5 py-1.5 text-[11px] text-amber-200">
          {error}
        </div>
      )}
    </div>
  );
}

function iconFor(id: PaymentProviderId) {
  switch (id) {
    case "crypto_manual":
      return Bitcoin;
    case "local_manual":
      return Landmark;
    case "paddle":
    case "lemon_squeezy":
    case "stripe":
      return CreditCard;
    default:
      return CreditCard;
  }
}

// ============================================================================
// Manual instructions UI (crypto / local bank)
// ============================================================================

function CryptoInstructions({
  paymentId,
  provider,
  instructions,
  onReset
}: {
  paymentId: string;
  provider: PaymentProviderId;
  instructions: ManualInstructions;
  onReset: () => void;
}) {
  const [txHash, setTxHash] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/crypto/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, txHash, note })
      });
      const d = (await res.json()) as { ok: boolean; message?: string; code?: string };
      if (!res.ok || !d.ok) {
        setError(d.message || d.code || `Submission failed (${res.status}).`);
        return;
      }
      setSubmitted(true);
      track("checkout_started", { plan: "manual_submitted", provider });
    } catch (err) {
      setError(`Submission failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const copyAddress = () => {
    if (!instructions.address || !navigator?.clipboard) return;
    void navigator.clipboard.writeText(instructions.address).catch(() => {
      /* ignore */
    });
  };

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-amber-400/35 bg-amber-500/[0.04] p-4">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-200">
          manual verification required
        </span>
        <p className="text-[12px] text-amber-100/85">
          Access is granted after payment confirmation. Reference{" "}
          <span className="font-mono text-white">{instructions.reference}</span>.
        </p>
      </div>

      {instructions.networkLabel && (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/[0.06] px-3 py-2 text-[11px] text-rose-100">
          <strong className="text-rose-200">{instructions.networkLabel}</strong> ·{" "}
          {instructions.networkWarning ||
            "Send only assets on the selected network. Incorrect networks may permanently lose funds."}
        </div>
      )}

      {instructions.address && (
        <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-[12px] text-white/85">
          <div className="text-[10px] uppercase tracking-wider text-white/40">
            receiving address
          </div>
          <div className="mt-1 flex items-start justify-between gap-2">
            <span className="break-all">{instructions.address}</span>
            <button
              type="button"
              onClick={copyAddress}
              className="shrink-0 rounded-md border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-white/85 transition hover:bg-white/[0.08]"
            >
              copy
            </button>
          </div>
        </div>
      )}

      <ul className="flex flex-col gap-1 text-[12px] text-white/80">
        {instructions.notes.map((n, i) => (
          <li key={i}>· {n}</li>
        ))}
      </ul>

      {submitted ? (
        <div className="rounded-md border border-emerald-400/35 bg-emerald-500/[0.08] px-3 py-2 text-[12px] text-emerald-200">
          Submission received. Reference{" "}
          <span className="font-mono">{instructions.reference}</span>. An operator
          will verify your transaction; check your audit feed for the grant.
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-xl border border-white/8 bg-white/[0.02] p-3">
          <label className="flex flex-col gap-1 text-[11px] text-white/65">
            Transaction hash
            <input
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              placeholder="0x… / 88-char hex / TRC-20 tx id"
              className="no-drag rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[11px] text-white"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-white/65">
            Note (optional)
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Email or context for follow-up"
              className="no-drag rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-white"
              maxLength={500}
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy || txHash.trim().length < 8}
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-accent/40 bg-accent/[0.1] px-3 py-1 text-[12px] font-semibold text-accent transition hover:bg-accent/[0.16] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              I sent the payment
            </button>
            <button
              type="button"
              onClick={onReset}
              className="text-[11px] text-white/55 hover:text-white"
            >
              cancel
            </button>
          </div>
          {error && (
            <div className="rounded-md border border-rose-400/40 bg-rose-500/[0.08] px-2.5 py-1.5 text-[11px] text-rose-200">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

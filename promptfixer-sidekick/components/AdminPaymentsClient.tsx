"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, ShieldAlert, XCircle } from "lucide-react";
import type { PaymentRecord, PaymentStatus } from "@/lib/payments/types";

/**
 * Admin payments client — pending crypto / local manual queue.
 *
 * Fetches `/api/admin/payments`. The route returns 403 outside dev (or
 * outside the admin allowlist), which we surface as a polite "Admin
 * access required" notice rather than a stack trace.
 */

interface FounderSnapshot {
  cap: number;
  claimed: number;
  remaining: number;
  soldOut: boolean;
}

interface PageState {
  loading: boolean;
  error: string | null;
  payments: PaymentRecord[];
  founder: FounderSnapshot | null;
  forbidden: { reason?: string } | null;
}

const INITIAL: PageState = {
  loading: false,
  error: null,
  payments: [],
  founder: null,
  forbidden: null
};

export function AdminPaymentsClient() {
  const [state, setState] = useState<PageState>(INITIAL);
  const [pending, setPending] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch("/api/admin/payments", { cache: "no-store" });
      if (res.status === 403) {
        const data = (await res.json().catch(() => ({}))) as { reason?: string };
        setState({
          ...INITIAL,
          forbidden: { reason: data.reason }
        });
        return;
      }
      const data = (await res.json()) as {
        ok: boolean;
        payments: PaymentRecord[];
        founder: FounderSnapshot;
      };
      if (!data.ok) {
        setState({ ...INITIAL, error: "Admin endpoint returned an error." });
        return;
      }
      setState({
        loading: false,
        error: null,
        payments: data.payments ?? [],
        founder: data.founder,
        forbidden: null
      });
    } catch (err) {
      setState({ ...INITIAL, error: (err as Error).message });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const act = useCallback(
    async (id: string, action: "verify" | "reject", reason?: string) => {
      setPending(`${action}:${id}`);
      try {
        const res = await fetch(`/api/admin/payments/${id}/${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: action === "reject" ? JSON.stringify({ reason }) : undefined
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { message?: string };
          alert(`${action} failed: ${data.message ?? res.status}`);
        }
      } catch (err) {
        alert(`${action} failed: ${(err as Error).message}`);
      } finally {
        setPending(null);
        void refresh();
      }
    },
    [refresh]
  );

  if (state.forbidden) {
    return (
      <article className="prose-page">
        <h1>Admin access required</h1>
        <p>
          This panel is only available in development by default. To enable it in
          production set <code>ENABLE_ADMIN_ROUTES=true</code> and add your email to{" "}
          <code>ADMIN_EMAILS</code>. Reason returned by the server:{" "}
          <code>{state.forbidden.reason ?? "unspecified"}</code>.
        </p>
      </article>
    );
  }

  return (
    <article className="prose-page" style={{ maxWidth: "min(72rem, 100%)" }}>
      <header className="flex items-center justify-between gap-3">
        <h1 style={{ marginBottom: 0 }}>Payments queue</h1>
        <button
          type="button"
          onClick={() => void refresh()}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[12px] font-medium text-white/85 transition hover:bg-white/[0.08]"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </header>

      {state.founder && (
        <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-amber-400/35 bg-amber-500/[0.08] px-2 py-1 font-mono text-[11px] text-amber-200">
          <ShieldAlert className="h-3.5 w-3.5" />
          founder seats · {state.founder.claimed} / {state.founder.cap} claimed ·{" "}
          {state.founder.remaining} remaining
          {state.founder.soldOut && " · SOLD OUT"}
        </div>
      )}

      {state.loading && (
        <p className="muted">
          <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> Loading queue…
        </p>
      )}
      {state.error && (
        <div className="mt-3 rounded-md border border-rose-400/40 bg-rose-500/[0.08] px-3 py-2 text-[12px] text-rose-200">
          {state.error}
        </div>
      )}

      {!state.loading && state.payments.length === 0 && !state.error && (
        <p className="muted">No pending payments. Queue is clean.</p>
      )}

      {state.payments.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {state.payments.map((p) => (
            <li
              key={p.id}
              className="rounded-2xl border border-white/8 bg-white/[0.02] p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] text-white">{p.reference}</span>
                  <StatusPill status={p.status} />
                  <span className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/55">
                    {p.provider}
                  </span>
                  <span className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/55">
                    {p.plan}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-white/45">
                  {new Date(p.createdAt).toLocaleString()}
                </span>
              </div>

              <dl className="mt-3 grid grid-cols-1 gap-y-1 text-[12px] text-white/75 sm:grid-cols-[140px_minmax(0,1fr)]">
                <dt className="text-white/45">identity</dt>
                <dd className="font-mono text-[11px] text-white/75">
                  {p.identityKey}
                </dd>
                {p.email && (
                  <>
                    <dt className="text-white/45">email</dt>
                    <dd className="font-mono text-[11px] text-white/75">{p.email}</dd>
                  </>
                )}
                {p.amount && (
                  <>
                    <dt className="text-white/45">amount</dt>
                    <dd>
                      {p.amount.value} {p.amount.currency}
                    </dd>
                  </>
                )}
                {p.crypto && (
                  <>
                    <dt className="text-white/45">network</dt>
                    <dd className="font-mono text-[11px]">{p.crypto.network}</dd>
                    <dt className="text-white/45">address</dt>
                    <dd className="break-all font-mono text-[11px]">
                      {p.crypto.address}
                    </dd>
                    {p.crypto.txHash && (
                      <>
                        <dt className="text-white/45">tx hash</dt>
                        <dd className="break-all font-mono text-[11px] text-emerald-200">
                          {p.crypto.txHash}
                          {(() => {
                            const url = explorerUrlFor(
                              p.crypto?.network,
                              p.crypto?.txHash
                            );
                            return url ? (
                              <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="ml-2 inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-accent transition hover:bg-white/[0.08]"
                              >
                                open in explorer ↗
                              </a>
                            ) : null;
                          })()}
                        </dd>
                      </>
                    )}
                    {p.crypto.txNote && (
                      <>
                        <dt className="text-white/45">user note</dt>
                        <dd className="text-[11px]">{p.crypto.txNote}</dd>
                      </>
                    )}
                  </>
                )}
              </dl>

              {p.status !== "verified" && p.status !== "rejected" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pending !== null}
                    onClick={() => void act(p.id, "verify")}
                    className="inline-flex items-center gap-1.5 rounded-md border border-emerald-400/40 bg-emerald-500/[0.1] px-2.5 py-1 text-[12px] font-medium text-emerald-200 transition hover:bg-emerald-500/[0.16] disabled:opacity-50"
                  >
                    {pending === `verify:${p.id}` ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Verify · grant plan
                  </button>
                  <button
                    type="button"
                    disabled={pending !== null}
                    onClick={() => {
                      const reason =
                        prompt("Rejection reason (optional):") ?? undefined;
                      void act(p.id, "reject", reason);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md border border-rose-400/40 bg-rose-500/[0.08] px-2.5 py-1 text-[12px] font-medium text-rose-200 transition hover:bg-rose-500/[0.16] disabled:opacity-50"
                  >
                    {pending === `reject:${p.id}` ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" />
                    )}
                    Reject
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

/**
 * Block-explorer URL per supported network. The actual templates are
 * read at runtime so deployments can override via env if a network
 * moves explorers — defaults below cover the launch set.
 */
function explorerUrlFor(network: string | undefined, txHash: string | undefined): string | null {
  if (!network || !txHash) return null;
  switch (network) {
    case "btc":
      return `https://mempool.space/tx/${txHash}`;
    case "usdt-trc20":
      return `https://tronscan.org/#/transaction/${txHash}`;
    case "usdt-erc20":
    case "usdc-erc20":
      return `https://etherscan.io/tx/${txHash}`;
    case "sol":
      return `https://solscan.io/tx/${txHash}`;
    default:
      return null;
  }
}

function StatusPill({ status }: { status: PaymentStatus }) {
  const tone =
    status === "verified"
      ? "border-emerald-400/40 bg-emerald-500/[0.1] text-emerald-200"
      : status === "rejected"
        ? "border-rose-400/40 bg-rose-500/[0.08] text-rose-200"
        : status === "submitted"
          ? "border-accent/40 bg-accent/[0.08] text-accent"
          : "border-amber-400/30 bg-amber-500/[0.08] text-amber-200";
  return (
    <span
      className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tone}`}
    >
      {status}
    </span>
  );
}

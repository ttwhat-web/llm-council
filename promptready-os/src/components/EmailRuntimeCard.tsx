"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  AlertTriangle,
  Bot,
  ChevronRight,
  Inbox,
  Mail,
  PenLine,
  Receipt,
  Target
} from "lucide-react";
import { statusForModule, statusMeta } from "@/services/adapters";

const TONE_PILL: Record<"ok" | "accent" | "muted" | "bad", string> = {
  ok: "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200",
  accent: "border-accent/30 bg-accent/[0.08] text-accent",
  muted: "border-white/10 bg-white/[0.03] text-white/55",
  bad: "border-rose-400/30 bg-rose-500/[0.08] text-rose-200"
};

/**
 * Email Runtime · adapter only.
 *
 * This is NOT an inbox clone. It surfaces what needs operator action
 * and routes mail into missions. No mailbox is connected today — every
 * counter reads "—" and every adapter reads "not connected". Mail sync
 * wires in with the desktop runtime; until then this is honest scaffolding.
 */

interface Category {
  key: string;
  label: string;
  urgent?: boolean;
}

const CATEGORIES: Category[] = [
  { key: "inbox", label: "Inbox" },
  { key: "leads", label: "Leads" },
  { key: "orders", label: "Orders" },
  { key: "invoices", label: "Invoices" },
  { key: "support", label: "Support" },
  { key: "urgent", label: "Urgent", urgent: true },
  { key: "waiting-reply", label: "Waiting Reply" },
  { key: "customers", label: "Customer messages" }
];

const FLOW: { Icon: typeof Mail; label: string }[] = [
  { Icon: Mail, label: "Message" },
  { Icon: Bot, label: "classify" },
  { Icon: Target, label: "mission" },
  { Icon: Receipt, label: "receipt" },
  { Icon: PenLine, label: "draft reply" }
];

const ADAPTERS = ["Gmail", "IMAP", "Outlook", "Apple Mail"];

interface IntegrationPlan {
  provider: string;
  steps: string[];
}

const INTEGRATION_PLAN: IntegrationPlan[] = [
  {
    provider: "Gmail",
    steps: [
      "OAuth read-only labels first",
      "History API later",
      "draft-only reply later"
    ]
  },
  {
    provider: "IMAP",
    steps: [
      "host / port / app password",
      "read-only first"
    ]
  },
  {
    provider: "Outlook / Microsoft 365",
    steps: [
      "Microsoft Graph read-only",
      "draft later"
    ]
  },
  {
    provider: "Apple Mail",
    steps: [
      "local desktop import planned (no API; reads local mail store via the desktop runtime later)"
    ]
  }
];

const STORAGE_KEY = "promptready-os.email-runtime.expanded";

function loadExpanded(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === null ? true : raw === "true";
  } catch {
    return true;
  }
}

export function EmailRuntimeCard() {
  const [expanded, setExpanded] = useState<boolean>(() => loadExpanded());

  const emailStatus = statusForModule("email").status;
  const emailMeta = statusMeta(emailStatus);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(expanded));
    } catch {
      // ignore
    }
  }, [expanded]);

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Email Runtime</span>
        </div>
        <span
          className={clsx(
            "rounded border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider",
            TONE_PILL[emailMeta.tone]
          )}
        >
          {emailMeta.label}
        </span>
      </header>

      <p className="text-[11px] text-white/55">
        Not an inbox clone. It surfaces what needs operator action and routes
        mail into missions. No mailbox is connected — counts stay at zero until
        an adapter wires in with the desktop runtime.
      </p>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="self-start rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[9.5px] uppercase tracking-wider text-white/55 hover:bg-white/[0.06]"
      >
        {expanded ? "collapse" : "expand"}
      </button>

      {expanded && (
        <>
          <ul className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {CATEGORIES.map((c) => (
              <li
                key={c.key}
                className={clsx(
                  "flex flex-col gap-1 rounded-xl border p-2.5",
                  c.urgent
                    ? "border-amber-400/30 bg-amber-500/[0.06]"
                    : "border-white/8 bg-white/[0.012]"
                )}
              >
                <div className="flex items-center gap-1.5">
                  {c.urgent && <AlertTriangle className="h-3 w-3 text-amber-300" />}
                  <span
                    className={clsx(
                      "font-mono text-[9px] uppercase tracking-[0.22em]",
                      c.urgent ? "text-amber-200/70" : "text-white/45"
                    )}
                  >
                    {c.label}
                  </span>
                </div>
                <span
                  className={clsx(
                    "font-mono text-[14px] tabular-nums",
                    c.urgent ? "text-amber-200" : "text-white"
                  )}
                >
                  &mdash;
                </span>
                <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/40">
                  offline
                </span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.012] p-2.5">
            {FLOW.map((step, i) => (
              <div key={step.label} className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/55">
                  <step.Icon className="h-3 w-3 text-accent" />
                  {step.label}
                </span>
                {i < FLOW.length - 1 && (
                  <ChevronRight className="h-3 w-3 text-white/30" />
                )}
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-accent/20 bg-accent/[0.03] p-3">
            <span className="font-mono text-[9px] uppercase tracking-wider text-accent">
              example · illustrative, not live
            </span>
            <p className="mt-1 text-[11px] text-white/55">
              UPS shipping mail arrives &rarr; Mission: check shipment &middot;
              reply customer &middot; update order.
            </p>
          </div>

          <ul className="flex flex-col gap-2">
            {ADAPTERS.map((name) => (
              <li
                key={name}
                className="flex items-center justify-between gap-2 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1.5"
              >
                <span className="flex items-center gap-1.5 text-[12px] text-white">
                  <Inbox className="h-3.5 w-3.5 text-accent" />
                  {name}
                </span>
                <span
                  className={clsx(
                    "rounded border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider",
                    TONE_PILL.muted
                  )}
                >
                  not connected
                </span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2 rounded-xl border border-white/8 bg-white/[0.012] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[9px] uppercase tracking-wider text-accent">
                integration plan · design only
              </span>
              <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">
                no oauth · nothing connects today
              </span>
            </div>
            <p className="text-[11px] text-white/55">
              How each provider will connect in a later phase. This is planned
              design — none of it is wired up and no credentials are requested.
            </p>
            <ul className="flex flex-col gap-2">
              {INTEGRATION_PLAN.map((plan) => (
                <li
                  key={plan.provider}
                  className="flex flex-col gap-1.5 rounded-md border border-white/8 bg-white/[0.012] p-2.5"
                >
                  <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.22em] text-white/55">
                    <Inbox className="h-3 w-3 text-accent" />
                    {plan.provider}
                  </span>
                  <ul className="flex flex-col gap-1">
                    {plan.steps.map((step) => (
                      <li
                        key={step}
                        className="flex items-start gap-1.5 text-[11px] text-white/55"
                      >
                        <span className="mt-[3px] h-1 w-1 shrink-0 rounded-full bg-accent/50" />
                        <span className="font-mono text-[10px] leading-snug text-white/55">
                          {step}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[11px] text-white/55">
            Read-only first &middot; no send &middot; no sync yet.
          </p>

          <footer className="border-t border-white/6 pt-2 font-mono text-[9.5px] uppercase tracking-wider text-white/45">
            No mailbox sync today. Adapters wire in with the desktop runtime.
          </footer>
        </>
      )}
    </section>
  );
}

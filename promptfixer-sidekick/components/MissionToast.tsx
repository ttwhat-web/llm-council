"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, X, Info, AlertCircle } from "lucide-react";
import { track } from "@/lib/analytics";

/**
 * Reads `?billing=success|cancel|portal-return` from the URL and
 * renders a transient toast. The query param is cleared via
 * `router.replace` so reloads don't re-fire.
 *
 * - success         → emerald  "Plan activated"
 * - cancel          → amber    "Checkout cancelled"
 * - portal-return   → neutral  "Welcome back"
 */

type Tone = "ok" | "warn" | "info";

interface ToastSpec {
  tone: Tone;
  title: string;
  body: string;
}

const SPECS: Record<string, ToastSpec> = {
  success: {
    tone: "ok",
    title: "Plan activated.",
    body: "Welcome aboard. Your new plan is live and the chip will reflect it momentarily."
  },
  cancel: {
    tone: "warn",
    title: "Checkout cancelled.",
    body: "No charge was made. You can pick a plan again from the upgrade modal whenever you're ready."
  },
  "portal-return": {
    tone: "info",
    title: "Welcome back.",
    body: "Subscription changes take effect immediately."
  }
};

export function MissionToast() {
  const router = useRouter();
  const params = useSearchParams();
  const [active, setActive] = useState<ToastSpec | null>(null);

  useEffect(() => {
    const billing = params.get("billing");
    if (!billing) return;
    const spec = SPECS[billing];
    if (!spec) return;
    setActive(spec);
    if (billing === "success") track("checkout_success", { source: "billing-return" });
    if (billing === "cancel") track("checkout_started", { stage: "cancelled" });
    // Clear the param without scrolling.
    const next = new URLSearchParams(params.toString());
    next.delete("billing");
    const qs = next.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
    const timeout = window.setTimeout(() => setActive(null), 6000);
    return () => window.clearTimeout(timeout);
    // We deliberately key only on the param; the params object is stable
    // enough across Suspense boundaries that a deeper deps list adds noise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get("billing")]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="toast"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-auto fixed left-1/2 top-4 z-40 -translate-x-1/2"
        >
          <div
            className={`flex items-start gap-2.5 rounded-xl border px-3 py-2 shadow-glass backdrop-blur-md ${
              active.tone === "ok"
                ? "border-emerald-400/40 bg-emerald-500/[0.12] text-emerald-100"
                : active.tone === "warn"
                  ? "border-amber-400/40 bg-amber-500/[0.12] text-amber-100"
                  : "border-white/10 bg-white/[0.06] text-white/85"
            }`}
          >
            {active.tone === "ok" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : active.tone === "warn" ? (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div className="flex flex-col leading-tight">
              <span className="text-[12px] font-semibold">{active.title}</span>
              <span className="text-[11px] opacity-80">{active.body}</span>
            </div>
            <button
              type="button"
              onClick={() => setActive(null)}
              className="ml-2 rounded-md p-1 text-current/70 transition hover:bg-white/[0.08]"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

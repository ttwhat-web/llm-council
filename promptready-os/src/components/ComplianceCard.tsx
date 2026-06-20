"use client";

import { useEffect, useState } from "react";
import { Globe, Lock, ShieldCheck, ShieldOff } from "lucide-react";
import { auditLog } from "@/services/auditLog";

/**
 * Compliance toggles · Phase 24.
 *
 * Local-only flags. Each toggle persists to localStorage and is
 * advisory — there's no engine that consults them yet. They exist so
 * the operator can declare a posture (and so audit log records the
 * declaration). Real enforcement lands with the Tauri runtime.
 */

type PolicyKey =
  | "local-only-mode"
  | "cloud-disabled"
  | "byok-required"
  | "air-gap"
  | "redaction"
  | "secure-export";

interface Policy {
  key: PolicyKey;
  label: string;
  hint: string;
  defaultOn: boolean;
}

const POLICIES: Policy[] = [
  { key: "local-only-mode", label: "Local-only mode", hint: "Refuse any outbound HTTP except Ollama.", defaultOn: true },
  { key: "cloud-disabled", label: "Cloud disabled", hint: "Hide cloud engine + BYOK key fields.", defaultOn: false },
  { key: "byok-required", label: "BYOK required", hint: "Refuse cloud routing without operator-supplied keys.", defaultOn: true },
  { key: "air-gap", label: "Air-gap mode", hint: "Disable Ollama probe, Telegram bridge, snapshot import.", defaultOn: false },
  { key: "redaction", label: "Redaction", hint: "Strip emails / phone numbers from logs before export.", defaultOn: false },
  { key: "secure-export", label: "Secure export", hint: "Prompt for passphrase before snapshot or audit export.", defaultOn: false }
];

const STORAGE_KEY = "promptready-os.policies";

function loadPolicies(): Record<PolicyKey, boolean> {
  const defaults: Record<PolicyKey, boolean> = POLICIES.reduce(
    (acc, p) => ({ ...acc, [p.key]: p.defaultOn }),
    {} as Record<PolicyKey, boolean>
  );
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Record<PolicyKey, boolean>>;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

function savePolicies(p: Record<PolicyKey, boolean>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

export function ComplianceCard() {
  const [state, setState] = useState<Record<PolicyKey, boolean>>(() => loadPolicies());

  useEffect(() => {
    savePolicies(state);
  }, [state]);

  const toggle = (key: PolicyKey) => {
    setState((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      auditLog("policy.toggle", { key, on: next[key] });
      return next;
    });
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Compliance · policy</span>
        </div>
        <span className="rounded border border-amber-400/30 bg-amber-500/[0.06] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-amber-200">
          declarations · enforcement ships with desktop runtime
        </span>
      </header>

      <p className="text-[11px] text-white/55">
        Local-only toggles. Each declaration is written to the audit log.
        Enforcement lands when the Tauri runtime gates outbound calls;
        until then these are operator-side posture declarations.
      </p>

      <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
        {POLICIES.map((p) => {
          const on = state[p.key];
          return (
            <li
              key={p.key}
              className="flex items-start justify-between gap-2 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1.5"
            >
              <div className="flex min-w-0 flex-col">
                <span className="text-[12px] text-white">{p.label}</span>
                <span className="text-[10.5px] text-white/55">{p.hint}</span>
              </div>
              <button
                type="button"
                onClick={() => toggle(p.key)}
                className={
                  on
                    ? "inline-flex items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-500/[0.08] px-2 py-1 font-mono text-[9.5px] uppercase tracking-wider text-emerald-200 hover:bg-emerald-500/[0.14]"
                    : "inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[9.5px] uppercase tracking-wider text-white/65 hover:bg-white/[0.06]"
                }
              >
                {on ? <ShieldCheck className="h-2.5 w-2.5" /> : <ShieldOff className="h-2.5 w-2.5" />}
                {on ? "on" : "off"}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
        <SecurityFeature
          Icon={Lock}
          title="Encrypted snapshots"
          state="planned"
          hint="Passphrase-wrapped .brainpack."
        />
        <SecurityFeature
          Icon={ShieldCheck}
          title="Vault lock"
          state="planned"
          hint="Biometric / passphrase gate at boot."
        />
        <SecurityFeature
          Icon={Globe}
          title="SSO + RBAC"
          state="planned"
          hint="Team workspace · Phase 29."
        />
      </div>
    </section>
  );
}

function SecurityFeature({
  Icon,
  title,
  hint,
  state
}: {
  Icon: typeof Lock;
  title: string;
  hint: string;
  state: "ready" | "planned";
}) {
  return (
    <article className="flex items-start gap-2 rounded-xl border border-white/8 bg-white/[0.012] p-3">
      <Icon className="mt-0.5 h-3.5 w-3.5 text-accent" />
      <div className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-white">
          {title}
          <span
            className={
              state === "ready"
                ? "rounded border border-emerald-400/30 bg-emerald-500/[0.08] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-emerald-200"
                : "rounded border border-white/10 bg-white/[0.03] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-white/55"
            }
          >
            {state === "ready" ? "ready" : "Coming soon"}
          </span>
        </span>
        <span className="text-[10.5px] text-white/55">{hint}</span>
      </div>
    </article>
  );
}

"use client";

import { useState } from "react";
import { ShieldCheck, ShieldOff } from "lucide-react";
import {
  readShield,
  setShield,
  type ShieldAction,
  type ShieldState
} from "@/services/runtimeShield";

/**
 * Runtime Shield · Settings card.
 *
 * Local policy toggles that gate REMOTE actions coming in through the
 * Telegram command parser (and any future mobile companion command
 * surface). Defaults are conservative.
 *
 * Every flip is audit-logged via `setShield`. Every blocked command
 * (handled in commandConsole.ts) writes an audit entry too.
 */

interface Row {
  key: ShieldAction;
  label: string;
  hint: string;
}

const ROWS: Row[] = [
  { key: "run", label: "Allow remote /run", hint: "Dispatch missions from Telegram / mobile." },
  { key: "approve", label: "Allow remote /approve · /reject", hint: "Approve or reject paused workflows from remote." },
  { key: "pause-resume", label: "Allow remote /pause · /resume", hint: "Cancel current mission · acknowledge resume." },
  { key: "receipt", label: "Allow remote /receipt", hint: "Pull mission receipts to a remote device." },
  { key: "inbox-capture", label: "Allow remote inbox capture", hint: "Phone-side capture pushes text / url / repo into the inbox." }
];

export function RuntimeShieldCard() {
  const [state, setStateLocal] = useState<ShieldState>(() => readShield());

  const toggle = (key: ShieldAction) => {
    const cur = readShield();
    const k = keyOf(key);
    const next = !cur[k];
    setShield(key, next);
    setStateLocal({ ...cur, [k]: next });
  };

  const enabledCount = (Object.values(state) as boolean[]).filter(Boolean).length;
  const headerTone = enabledCount === 0 ? "muted" : enabledCount < 3 ? "ok" : "warn";

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Runtime Shield</span>
        </div>
        <span
          className={
            headerTone === "warn"
              ? "rounded border border-amber-400/30 bg-amber-500/[0.08] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-amber-200"
              : headerTone === "ok"
                ? "rounded border border-emerald-400/30 bg-emerald-500/[0.08] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-emerald-200"
                : "rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/55"
          }
        >
          {enabledCount} of {ROWS.length} remote actions enabled
        </span>
      </header>

      <p className="text-[11.5px] text-white/65">
        Local policy gates for the Telegram bridge + any future mobile
        companion. Default-deny on destructive verbs. Every toggle flip
        is recorded in the audit log; every blocked command attempt is
        too.
      </p>

      <ul className="mt-3 flex flex-col gap-2">
        {ROWS.map((r) => {
          const on = state[keyOf(r.key)];
          return (
            <li
              key={r.key}
              className="flex items-center justify-between gap-2 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1.5"
            >
              <div className="flex min-w-0 flex-col">
                <span className="text-[12px] text-white">{r.label}</span>
                <span className="text-[10.5px] text-white/55">{r.hint}</span>
              </div>
              <button
                type="button"
                onClick={() => toggle(r.key)}
                className={
                  on
                    ? "inline-flex items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-500/[0.08] px-2 py-1 font-mono text-[9.5px] uppercase tracking-wider text-emerald-200 hover:bg-emerald-500/[0.14]"
                    : "inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[9.5px] uppercase tracking-wider text-white/65 hover:bg-white/[0.06]"
                }
              >
                {on ? <ShieldCheck className="h-2.5 w-2.5" /> : <ShieldOff className="h-2.5 w-2.5" />}
                {on ? "allow" : "deny"}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[10px] text-white/45">
        Defaults: receipt + inbox capture allowed · run / approve /
        pause-resume denied. Telegram returns a clear "disabled" message
        when a blocked verb is attempted.
      </p>
    </section>
  );
}

function keyOf(action: ShieldAction): keyof ShieldState {
  switch (action) {
    case "run":
      return "run";
    case "approve":
      return "approve";
    case "pause-resume":
      return "pauseResume";
    case "receipt":
      return "receipt";
    case "inbox-capture":
      return "inboxCapture";
  }
}

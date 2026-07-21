"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { CheckSquare, Square, ClipboardCheck } from "lucide-react";

/**
 * Button Audit · Sprint M.
 *
 * A manual click-test checklist for the key actions on each surface. We
 * do NOT auto-click anything (that would be risky); this is a tester's
 * checklist whose ticked state persists locally so a QA pass can be
 * tracked. Honest scope only — every item maps to a real action that
 * already exists in the app.
 */

interface AuditItem {
  surface: string;
  actions: string[];
}

const AUDIT: AuditItem[] = [
  { surface: "Atlas", actions: ["open a cell detail", "dispatch from a panel", "export blueprint", "switch home mode"] },
  { surface: "Market Lab", actions: ["crypto watchlist loads", "chart stack 1/2/4/6", "news create-mission", "news save-to-brain", "TV wall toggle"] },
  { surface: "Voice", actions: ["run a command chip", "hold space to talk", "paste cleaner clean+copy", "task mark done", "task delete (confirm)"] },
  { surface: "Terminal", actions: ["command bar /", "tab switch", "Live Wall (w)", "Broadcast (b)", "crypto refresh"] },
  { surface: "Settings", actions: ["theme switch", "background switch", "model lab probe", "snapshot export", "telegram field test"] },
  { surface: "Library", actions: ["expand receipt", "copy replay", "export .md", "run follow-up"] },
  { surface: "Marketplace", actions: ["install a pack", "export a pack", "import .pack.json"] }
];

const KEY = "promptready-os.button-audit";

function load(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function ButtonAuditCard() {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => load());

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(checked));
    } catch {
      // ignore
    }
  }, [checked]);

  const total = AUDIT.reduce((n, s) => n + s.actions.length, 0);
  const done = Object.values(checked).filter(Boolean).length;

  const toggle = (id: string) => setChecked((c) => ({ ...c, [id]: !c[id] }));

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Button Audit · click-test</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/55">
            {done}/{total} verified
          </span>
          {done > 0 && (
            <button
              type="button"
              onClick={() => setChecked({})}
              className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/65 hover:bg-white/[0.06]"
            >
              reset
            </button>
          )}
        </div>
      </header>

      <p className="text-[11px] text-white/55">
        Manual checklist — no auto-clicking. Open each surface, click the action,
        confirm it works, then tick it here. Ticks persist locally.
      </p>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {AUDIT.map((s) => (
          <div key={s.surface} className="flex flex-col gap-1 rounded-xl border border-white/8 bg-white/[0.012] p-2.5">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-accent">{s.surface}</span>
            <ul className="flex flex-col gap-0.5">
              {s.actions.map((a) => {
                const id = `${s.surface}·${a}`;
                const on = !!checked[id];
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => toggle(id)}
                      className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left text-[11px] hover:bg-white/[0.04]"
                    >
                      {on ? (
                        <CheckSquare className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
                      ) : (
                        <Square className="h-3.5 w-3.5 shrink-0 text-white/35" />
                      )}
                      <span className={clsx(on ? "text-white/50 line-through" : "text-white/80")}>{a}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

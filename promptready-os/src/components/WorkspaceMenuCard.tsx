"use client";

import { useEffect } from "react";
import clsx from "clsx";
import { Eye, EyeOff, LayoutGrid } from "lucide-react";
import {
  NAV_ITEMS,
  useWorkspace,
  toggleNavHidden,
  updateWorkspace,
  type DefaultHome,
  type StartupMode,
  type Density
} from "@/store/workspace";

/**
 * Workspace personalization · Sprint FINAL-UX.
 *
 * Show/hide nav items in the side rail, choose default home, startup
 * mode, and density. Persisted locally. Routes are NEVER removed —
 * hidden items still work via the command palette and direct URL.
 */

const HOMES: Array<{ id: DefaultHome; label: string }> = [
  { id: "atlas", label: "Atlas" },
  { id: "market-lab", label: "Market Lab" },
  { id: "voice", label: "Voice · Jarvis" },
  { id: "terminal", label: "Terminal" }
];

const STARTUPS: Array<{ id: StartupMode; label: string }> = [
  { id: "operator", label: "Operator" },
  { id: "market", label: "Market" },
  { id: "voice", label: "Voice" },
  { id: "focus", label: "Focus" }
];

const DENSITIES: Array<{ id: Density; label: string }> = [
  { id: "comfortable", label: "Comfortable" },
  { id: "compact", label: "Compact" }
];

export function WorkspaceMenuCard() {
  const ws = useWorkspace();

  // Reflect density on the document so future CSS hooks can adapt.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.dataset.density = ws.density;
  }, [ws.density]);

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Workspace Menu</span>
        </div>
        <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/55">
          {ws.hiddenNav.length} hidden · {NAV_ITEMS.length - ws.hiddenNav.length} visible
        </span>
      </header>

      <p className="text-[11px] text-white/55">
        Choose what shows in your side rail and how the app starts. Routes are
        never removed — hidden items still work via the Command Palette
        (Cmd/Ctrl+K) and direct URL.
      </p>

      {/* nav visibility */}
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-white/40">
          show in nav
        </span>
        <ul className="grid grid-cols-1 gap-1 md:grid-cols-2">
          {NAV_ITEMS.map((n) => {
            const hidden = ws.hiddenNav.includes(n.id);
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => toggleNavHidden(n.id)}
                  className={clsx(
                    "flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1 text-left font-mono text-[11px] transition",
                    hidden
                      ? "border-white/8 bg-white/[0.012] text-white/45"
                      : "border-accent/25 bg-accent/[0.05] text-white/85 hover:bg-accent/[0.08]"
                  )}
                  aria-label={hidden ? `show ${n.label} in nav` : `hide ${n.label} from nav`}
                  title={hidden ? "Click to show in nav" : "Click to hide from nav"}
                >
                  <span>{n.label}</span>
                  {hidden ? (
                    <EyeOff className="h-3 w-3 text-white/40" />
                  ) : (
                    <Eye className="h-3 w-3 text-accent" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* default home + startup mode */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Picker
          title="default home"
          options={HOMES}
          value={ws.defaultHome}
          onChange={(v) => updateWorkspace({ defaultHome: v })}
        />
        <Picker
          title="startup mode"
          options={STARTUPS}
          value={ws.startupMode}
          onChange={(v) => updateWorkspace({ startupMode: v })}
        />
      </div>

      {/* density */}
      <Picker
        title="density"
        options={DENSITIES}
        value={ws.density}
        onChange={(v) => updateWorkspace({ density: v })}
        hint="applied where supported · attribute set on <body>"
      />

      <p className="font-mono text-[9px] uppercase tracking-wider text-white/35">
        theme + background live in Settings → Appearance.
      </p>
    </section>
  );
}

function Picker<T extends string>({
  title,
  options,
  value,
  onChange,
  hint
}: {
  title: string;
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-white/8 bg-white/[0.012] p-2.5">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-white/40">
        {title}
      </span>
      <div className="flex flex-wrap items-center gap-1">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={clsx(
              "rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition",
              o.id === value
                ? "border-accent/40 bg-accent/[0.1] text-accent shadow-glow"
                : "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.06]"
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      {hint && (
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/35">{hint}</span>
      )}
    </div>
  );
}

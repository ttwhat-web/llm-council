"use client";

import { NavLink, Outlet } from "react-router-dom";
import clsx from "clsx";
import {
  Activity,
  Archive,
  Bot,
  Brain,
  Cpu,
  Library,
  Settings as SettingsIcon,
  Terminal as TerminalIcon,
  Workflow
} from "lucide-react";
import { KbdHint } from "@/components/primitives/KbdHint";

/**
 * Shell layout · PromptReady OS frame.
 *
 * Left rail — eight top-level operator surfaces (Phase 11 rebuild):
 *   Mission Control · Agents · Memory · Library · Terminal · Workflows ·
 *   Brain · Settings.
 *
 * Top header — wordmark + global status (engine · route · brain).
 *
 * Body — `<Outlet />` for the active route. The shell owns chrome and
 * navigation only; modules own their own internal layout. No fake
 * telemetry: status chips below are static labels, not animated
 * progress.
 */

interface NavItem {
  to: string;
  label: string;
  Icon: typeof Activity;
}

const NAV: NavItem[] = [
  { to: "/", label: "Mission Control", Icon: Workflow },
  { to: "/agents", label: "Agents", Icon: Bot },
  { to: "/memory", label: "Memory", Icon: Activity },
  { to: "/library", label: "Library", Icon: Library },
  { to: "/terminal", label: "Terminal", Icon: TerminalIcon },
  { to: "/workflows", label: "Workflows", Icon: Archive },
  { to: "/brain", label: "Brain", Icon: Brain },
  { to: "/settings", label: "Settings", Icon: SettingsIcon }
];

export function ShellLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* ---- left rail ---- */}
      <aside className="flex w-[64px] shrink-0 flex-col items-center justify-between border-r border-white/6 py-3">
        <div className="flex flex-col items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent/15 ring-1 ring-accent/30 shadow-glow"
            title="PromptReady OS"
          >
            <span className="font-mono text-[11px] tracking-wider text-accent">[ ]</span>
          </div>

          <nav className="flex flex-col items-center gap-1">
            {NAV.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                title={label}
                className={({ isActive }) =>
                  clsx(
                    "group relative flex h-10 w-10 items-center justify-center rounded-xl transition",
                    isActive
                      ? "bg-accent/12 text-accent shadow-[inset_0_0_0_1px_rgba(124,155,255,0.25)]"
                      : "text-white/55 hover:bg-white/5 hover:text-white/85"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className="h-4 w-4" />
                    {isActive && (
                      <span
                        aria-hidden
                        className="absolute -left-0.5 h-5 w-0.5 rounded-r bg-accent shadow-[0_0_8px_1px_rgba(124,155,255,0.6)]"
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <KbdHint keys={["cmd", "k"]} />
      </aside>

      {/* ---- main column ---- */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="drag-region flex items-center justify-between border-b border-white/6 px-5 py-2">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">
            <span className="text-accent">[ ]</span>
            <span>PromptReady OS</span>
            <span className="text-white/25">·</span>
            <span>Mission Control for AI Workflows</span>
          </div>
          <StatusRail />
        </header>

        <div className="flex-1 overflow-auto scrollbar-thin">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

// ============================================================================
// Status rail
// ============================================================================

/**
 * Static status chips. Every value here is a label, not a live metric —
 * the desktop runtime fills these from real Tauri commands when wired.
 * Until then we never animate them.
 */
function StatusRail() {
  return (
    <div className="no-drag flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.18em]">
      <StatusChip Icon={Cpu} label="engine" value="rules · ready" tone="ok" />
      <StatusChip Icon={Activity} label="route" value="local-first" tone="ok" />
      <StatusChip Icon={Brain} label="brain" value="local only" tone="muted" />
      <span className="text-white/30">·</span>
      <span className="text-white/35">v0.1 · BYOK</span>
    </div>
  );
}

function StatusChip({
  Icon,
  label,
  value,
  tone
}: {
  Icon: typeof Activity;
  label: string;
  value: string;
  tone: "ok" | "warn" | "muted";
}) {
  const cls = {
    ok: "border-emerald-400/30 bg-emerald-500/[0.06] text-emerald-200",
    warn: "border-amber-400/35 bg-amber-500/[0.06] text-amber-200",
    muted: "border-white/10 bg-white/[0.03] text-white/55"
  }[tone];
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5", cls)}>
      <Icon className="h-2.5 w-2.5" />
      <span className="text-white/50">{label}</span>
      <span className="text-white">{value}</span>
    </span>
  );
}

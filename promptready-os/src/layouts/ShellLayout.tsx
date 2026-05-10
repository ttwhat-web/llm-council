"use client";

import { NavLink, Outlet } from "react-router-dom";
import clsx from "clsx";
import {
  Activity,
  Hammer,
  Layers,
  Library,
  Rocket,
  Settings as SettingsIcon
} from "lucide-react";
import { KbdHint } from "@/components/primitives/KbdHint";

/**
 * Shell layout · the main app frame.
 *
 * Left rail = module navigation (icon + label).
 * Top header = brand + global command bar trigger.
 * Body = <Outlet /> for the active route.
 *
 * The shell never renders any module-specific UI itself — modules own
 * their own layout. The shell only owns navigation, the global header,
 * and the keyboard handler that summons the command palette.
 */

const NAV: Array<{ to: string; label: string; Icon: typeof Activity }> = [
  { to: "/",          label: "Dashboard", Icon: Activity },
  { to: "/fixer",     label: "Fixer",     Icon: Hammer },
  { to: "/launcher",  label: "Launcher",  Icon: Rocket },
  { to: "/vault",     label: "Vault",     Icon: Library },
  { to: "/sessions",  label: "Sessions",  Icon: Layers },
  { to: "/settings",  label: "Settings",  Icon: SettingsIcon }
];

export function ShellLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* ---- left rail ---- */}
      <aside className="flex w-[64px] shrink-0 flex-col items-center justify-between border-r border-white/6 py-3">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent/15 ring-1 ring-accent/30 shadow-glow">
            <span className="font-mono text-[10px] tracking-wider text-accent">PR</span>
          </div>

          <nav className="flex flex-col items-center gap-1">
            {NAV.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  clsx(
                    "group relative flex h-10 w-10 items-center justify-center rounded-xl transition",
                    isActive
                      ? "bg-accent/10 text-accent shadow-[inset_0_0_0_1px_rgba(124,155,255,0.25)]"
                      : "text-white/55 hover:bg-white/5 hover:text-white/85"
                  )
                }
                title={label}
              >
                <Icon className="h-4 w-4" />
              </NavLink>
            ))}
          </nav>
        </div>

        <KbdHint keys={["cmd", "k"]} />
      </aside>

      {/* ---- main column ---- */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="drag-region flex items-center justify-between border-b border-white/6 px-5 py-2">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/45">
            <span className="font-mono text-accent">PR</span>
            <span>PromptReady OS</span>
          </div>
          <div className="no-drag text-[10px] text-white/35">
            Local-first · BYOK · v0.1
          </div>
        </header>

        <div className="flex-1 overflow-auto scrollbar-thin">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

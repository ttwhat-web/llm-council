"use client";

import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import {
  Activity,
  AppWindow,
  Brain,
  Cpu,
  LineChart,
  Map as MapIcon,
  Server as ServerIcon,
  Settings as SettingsIcon
} from "lucide-react";
import { KbdHint } from "@/components/primitives/KbdHint";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { MediaDock } from "@/components/MediaDock";
import { CommandPalette } from "@/components/CommandPalette";
import { useUiModeStore } from "@/store/uiMode";
import { useWorkspace, DEFAULT_HOME_PATHS, type NavId } from "@/store/workspace";
import { useEffect, useRef } from "react";

// Map nav route → workspace nav id, used to filter the rail.
const NAV_ID_BY_PATH: Record<string, NavId> = {
  "/": "atlas",
  "/market-lab": "market-lab",
  "/server": "server",
  "/apps": "apps",
  "/atlas": "atlas",
  "/settings": "settings"
};

/**
 * Shell layout · Operator.Center frame.
 *
 * Primary rail is intentionally small: Market Lab, Server, Apps, Atlas,
 * Settings. Legacy surfaces remain routable through direct URLs and the
 * command palette, but they no longer clutter the main workstation.
 */

interface NavItem {
  to: string;
  label: string;
  Icon: typeof Activity;
}

const PRIMARY_NAV: NavItem[] = [
  { to: "/market-lab", label: "Market Lab", Icon: LineChart },
  { to: "/server", label: "Server", Icon: ServerIcon },
  { to: "/apps", label: "Apps", Icon: AppWindow },
  { to: "/atlas", label: "Atlas", Icon: MapIcon },
  { to: "/settings", label: "Settings", Icon: SettingsIcon }
];

export function ShellLayout() {
  const secondScreen = useUiModeStore((s) => s.secondScreen);
  const workspace = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();
  const homeRedirectedRef = useRef(false);

  // One-time default-home redirect when the app first lands on "/".
  useEffect(() => {
    if (homeRedirectedRef.current) return;
    homeRedirectedRef.current = true;
    if (workspace.defaultHome !== "atlas" && location.pathname === "/") {
      navigate(DEFAULT_HOME_PATHS[workspace.defaultHome], { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen w-screen max-w-full overflow-hidden">
      {/* ---- left rail (hidden in Second Screen mode) ---- */}
      {!secondScreen && (
      <aside className="flex w-[68px] shrink-0 flex-col items-center justify-between border-r border-white/8 bg-black/25 py-3">
        <div className="flex flex-col items-center gap-4">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-md border border-accent/25 bg-white/[0.025]"
            title="Operator.Center · Core · Atlas"
          >
            <span className="font-mono text-[11px] tracking-wider text-accent">[ ]</span>
          </div>

          <nav className="flex flex-col items-stretch gap-1.5" aria-label="Primary navigation">
            {PRIMARY_NAV
              .filter(({ to }) => {
                const id = NAV_ID_BY_PATH[to];
                return !id || !workspace.hiddenNav.includes(id);
              })
              .map(({ to, label, Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end
                    title={label}
                    className={({ isActive }) =>
                      clsx(
                        "group relative flex h-10 w-10 items-center justify-center rounded-md border transition",
                        isActive
                          ? "border-accent/30 bg-accent/[0.11] text-accent"
                          : "border-transparent text-white/50 hover:border-white/10 hover:bg-white/[0.055] hover:text-white/85"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className="h-4 w-4" />
                        {isActive && (
                          <span
                            aria-hidden
                            className="absolute -left-0.5 h-5 w-0.5 rounded-r bg-accent"
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
      )}

      {/* ---- main column ---- */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {!secondScreen && (
        <header className="drag-region flex min-w-0 items-center justify-between gap-3 overflow-hidden border-b border-white/6 px-5 py-2">
          <div className="flex min-w-0 items-center gap-2 truncate font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">
            <span className="text-accent">[ ]</span>
            <span>Operator.Center</span>
            <span className="text-white/25">·</span>
            <span>Workstation</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <StatusRail />
            <ThemeSwitcher />
          </div>
        </header>
        )}

        <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
          <Outlet />
        </div>
      </main>

      {/* Floating App Dock · official web apps open externally */}
      <MediaDock />

      {/* Global command palette · Cmd/Ctrl+K */}
      <CommandPalette />
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
    <div className="no-drag hidden items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.18em] xl:flex">
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

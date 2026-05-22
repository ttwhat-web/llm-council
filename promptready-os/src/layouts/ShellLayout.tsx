"use client";

import { NavLink, Outlet } from "react-router-dom";
import clsx from "clsx";
import {
  Activity,
  Bot,
  Brain,
  Cpu,
  Database,
  FileText,
  LineChart,
  Map as MapIcon,
  Mic,
  Package,
  Settings as SettingsIcon,
  Terminal as TerminalIcon,
  Workflow
} from "lucide-react";
import { KbdHint } from "@/components/primitives/KbdHint";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { MediaDock } from "@/components/MediaDock";
import { useUiModeStore } from "@/store/uiMode";

/**
 * Shell layout · Operator Core frame.
 *
 * UX RESET 01 · the left rail is now grouped into five operator
 * sections instead of a flat ten-icon list:
 *
 *   ATLAS    · home
 *   WORK     · Mission Control · Workflows · Delivery
 *   BRAIN    · Memory · Brain · Terminal
 *   OPERATOR · Agents · Marketplace
 *   SYSTEM   · Settings
 *
 * Every existing route is preserved · only the visual grouping and a
 * small mono group letter changed. No new pages.
 */

interface NavItem {
  to: string;
  label: string;
  Icon: typeof Activity;
}

interface NavGroup {
  id: string;
  letter: string;
  label: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    id: "atlas",
    letter: "A",
    label: "Atlas",
    items: [{ to: "/", label: "Atlas · home", Icon: MapIcon }]
  },
  {
    id: "work",
    letter: "W",
    label: "Work",
    items: [
      { to: "/mission-control", label: "Mission Control", Icon: Workflow },
      { to: "/workflows", label: "Workflows", Icon: Activity },
      { to: "/library", label: "Delivery · Operations Archive", Icon: FileText }
    ]
  },
  {
    id: "brain",
    letter: "B",
    label: "Brain",
    items: [
      { to: "/memory", label: "Memory", Icon: Database },
      { to: "/brain", label: "Brain · Repos · Health", Icon: Brain },
      { to: "/terminal", label: "Intelligence Terminal", Icon: TerminalIcon },
      { to: "/market-lab", label: "Market Lab · MIC", Icon: LineChart }
    ]
  },
  {
    id: "operator",
    letter: "O",
    label: "Operator",
    items: [
      { to: "/agents", label: "Agents", Icon: Bot },
      { to: "/voice", label: "Voice · Jarvis Console", Icon: Mic },
      { to: "/marketplace", label: "Marketplace", Icon: Package }
    ]
  },
  {
    id: "system",
    letter: "S",
    label: "System",
    items: [{ to: "/settings", label: "Settings · Runtime · Remote · Policies", Icon: SettingsIcon }]
  }
];

export function ShellLayout() {
  const secondScreen = useUiModeStore((s) => s.secondScreen);
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* ---- left rail (hidden in Second Screen mode) ---- */}
      {!secondScreen && (
      <aside className="flex w-[68px] shrink-0 flex-col items-center justify-between border-r border-white/6 py-3">
        <div className="flex flex-col items-center gap-4">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent/15 ring-1 ring-accent/30 shadow-glow"
            title="Operator.Center · Core · Atlas"
          >
            <span className="font-mono text-[11px] tracking-wider text-accent">[ ]</span>
          </div>

          <nav className="flex flex-col items-stretch gap-3">
            {GROUPS.map((group, gi) => (
              <div key={group.id} className="flex flex-col items-center gap-1">
                <span
                  className="select-none font-mono text-[9px] uppercase tracking-[0.22em] text-white/30"
                  title={group.label}
                >
                  {group.letter}
                </span>
                {group.items.map(({ to, label, Icon }) => (
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
                {gi < GROUPS.length - 1 && (
                  <span className="mt-2 h-px w-6 bg-white/8" aria-hidden />
                )}
              </div>
            ))}
          </nav>
        </div>

        <KbdHint keys={["cmd", "k"]} />
      </aside>
      )}

      {/* ---- main column ---- */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {!secondScreen && (
        <header className="drag-region flex items-center justify-between border-b border-white/6 px-5 py-2">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">
            <span className="text-accent">[ ]</span>
            <span>Operator.Center · Core</span>
            <span className="text-white/25">·</span>
            <span>AI Mission Control</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusRail />
            <ThemeSwitcher />
          </div>
        </header>
        )}

        <div className="flex-1 overflow-auto scrollbar-thin">
          <Outlet />
        </div>
      </main>

      {/* Floating media dock · user-selected media only */}
      <MediaDock />
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

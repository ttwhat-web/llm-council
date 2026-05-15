"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  Archive,
  Brain,
  LineChart,
  Settings,
  Workflow
} from "lucide-react";

/**
 * Persistent left rail for the Operator.Center shell.
 *
 * Renders five top-level destinations as a 56-px icon column on
 * desktop. Labels show on hover via title attributes; we keep the rail
 * tight so the operator surface stays dense.
 *
 * Mobile rendering lives in `OperatorMobileNav` — the rail itself is
 * hidden below md.
 */

type ItemId = "mission" | "library" | "memory" | "terminal" | "settings";

interface Item {
  id: ItemId;
  href: string;
  label: string;
  Icon: typeof Workflow;
  /** Paths whose prefix should mark this item as active. */
  activePrefixes: string[];
}

export const OPERATOR_NAV: Item[] = [
  {
    id: "mission",
    href: "/app",
    label: "Mission Control",
    Icon: Workflow,
    activePrefixes: ["/app"]
  },
  {
    id: "library",
    href: "/library",
    label: "Library",
    Icon: Archive,
    activePrefixes: ["/library"]
  },
  {
    id: "memory",
    href: "/memory",
    label: "Memory",
    Icon: Brain,
    activePrefixes: ["/memory"]
  },
  {
    id: "terminal",
    href: "/terminal",
    label: "Terminal",
    Icon: LineChart,
    activePrefixes: ["/terminal"]
  },
  {
    id: "settings",
    href: "/settings",
    label: "Settings",
    Icon: Settings,
    activePrefixes: ["/settings"]
  }
];

function isActive(pathname: string | null, item: Item): boolean {
  if (!pathname) return false;
  return item.activePrefixes.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

export function OperatorRail() {
  const pathname = usePathname();
  return (
    <aside
      aria-label="Operator navigation"
      className="hidden shrink-0 flex-col items-center gap-1 border-r border-white/6 bg-white/[0.012] py-3 md:flex"
      style={{ width: 56 }}
    >
      <Link
        href="/"
        title="operator.center"
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 ring-1 ring-accent/30 shadow-glow transition hover:bg-accent/[0.22]"
      >
        <span className="font-mono text-[11px] tracking-wider text-accent">[ ]</span>
      </Link>
      <nav className="mt-2 flex flex-col gap-1">
        {OPERATOR_NAV.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.id}
              href={item.href}
              title={item.label}
              className={clsx(
                "group relative flex h-9 w-9 items-center justify-center rounded-lg transition",
                active
                  ? "bg-accent/[0.12] text-accent ring-1 ring-accent/30"
                  : "text-white/55 hover:bg-white/[0.04] hover:text-white"
              )}
            >
              <item.Icon className="h-4 w-4" />
              {active && (
                <span
                  aria-hidden
                  className="absolute -left-0.5 h-5 w-0.5 rounded-r bg-accent shadow-[0_0_8px_1px_rgba(124,155,255,0.6)]"
                />
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

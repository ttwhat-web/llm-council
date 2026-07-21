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
      className="hidden shrink-0 flex-col items-center gap-1.5 border-r border-white/[0.06] bg-white/[0.012] py-3.5 md:flex"
      style={{ width: 56 }}
    >
      <Link
        href="/"
        title="operator.center"
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 ring-1 ring-accent/30 shadow-glow transition duration-200 hover:bg-accent/[0.22] hover:ring-accent/45 active:scale-95"
      >
        <span className="font-mono text-[11px] tracking-wider text-accent">[ ]</span>
      </Link>
      <span aria-hidden className="my-1 h-px w-6 bg-white/[0.06]" />
      <nav className="flex flex-col gap-1">
        {OPERATOR_NAV.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.id}
              href={item.href}
              title={item.label}
              className={clsx(
                "group relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200",
                active
                  ? "bg-accent/[0.14] text-accent ring-1 ring-accent/35 shadow-[inset_0_1px_0_rgba(230,230,250,0.06)]"
                  : "text-white/60 hover:bg-white/[0.05] hover:text-white"
              )}
            >
              <item.Icon
                className={clsx(
                  "h-4 w-4 transition-transform duration-200",
                  !active && "group-hover:scale-110"
                )}
              />
              {active && (
                <span
                  aria-hidden
                  className="absolute -left-[3px] h-5 w-[2px] rounded-r bg-accent shadow-[0_0_10px_1px_rgba(164,144,194,0.7)]"
                />
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { OPERATOR_NAV } from "./OperatorRail";

/**
 * Bottom tab bar shown on small screens. Keeps the five operator
 * surfaces one tap apart on mobile, where the desktop left rail is
 * hidden.
 */

export function OperatorMobileNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Operator navigation"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/8 bg-bg/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {OPERATOR_NAV.map((item) => {
        const active =
          pathname === item.href || pathname?.startsWith(item.href + "/");
        return (
          <Link
            key={item.id}
            href={item.href}
            className={clsx(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-2",
              active
                ? "text-accent"
                : "text-white/55 hover:text-white"
            )}
          >
            <item.Icon className="h-4 w-4" />
            <span
              className={clsx(
                "font-mono text-[8.5px] uppercase tracking-[0.18em]",
                active ? "text-accent" : "text-white/45"
              )}
            >
              {item.label.split(" ")[0]}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

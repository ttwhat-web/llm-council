"use client";

import clsx from "clsx";

/**
 * Primitive · KbdHint
 *
 * Uniform keyboard-shortcut chip. Used in the command bar, tooltips,
 * empty states, and the overlay header.
 */

export function KbdHint({
  keys,
  className
}: {
  keys: string | string[];
  className?: string;
}) {
  const items = Array.isArray(keys) ? keys : keys.split("+").map((k) => k.trim());
  return (
    <span className={clsx("inline-flex items-center gap-0.5", className)}>
      {items.map((k, i) => (
        <kbd
          key={`${k}-${i}`}
          className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-white/10 bg-white/[0.04] px-1 font-mono text-[10px] uppercase tracking-wider text-white/65"
        >
          {prettify(k)}
        </kbd>
      ))}
    </span>
  );
}

function prettify(k: string): string {
  const t = k.toLowerCase();
  if (t === "cmd" || t === "command" || t === "meta") return "⌘";
  if (t === "ctrl" || t === "control") return "⌃";
  if (t === "shift") return "⇧";
  if (t === "alt" || t === "option" || t === "opt") return "⌥";
  if (t === "enter" || t === "return") return "↵";
  if (t === "esc" || t === "escape") return "esc";
  if (t === "tab") return "⇥";
  return k.length === 1 ? k.toUpperCase() : k;
}

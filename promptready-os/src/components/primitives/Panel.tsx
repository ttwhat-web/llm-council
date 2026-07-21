"use client";

import clsx from "clsx";

/**
 * Primitive · Panel
 *
 * The base glass surface every module composes against. Variants control
 * how prominent the panel feels in the visual hierarchy.
 */

type Variant = "subtle" | "glass" | "strong";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  label?: string;
  tag?: string;
  children: React.ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  subtle: "border border-white/6 bg-white/[0.012]",
  glass: "glass",
  strong: "glass-strong"
};

export function Panel({
  variant = "subtle",
  label,
  tag,
  className,
  children,
  ...rest
}: Props) {
  return (
    <section
      {...rest}
      className={clsx("flex flex-col gap-3 rounded-2xl p-3", VARIANTS[variant], className)}
    >
      {(label || tag) && (
        <header className="flex items-baseline justify-between border-b border-white/5 pb-2">
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/65">
            {label}
          </span>
          {tag && (
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">
              {tag}
            </span>
          )}
        </header>
      )}
      {children}
    </section>
  );
}

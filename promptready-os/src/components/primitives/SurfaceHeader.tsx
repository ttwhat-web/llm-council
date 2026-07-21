import type { ReactNode } from "react";

/**
 * Shared header for every top-level surface in Operator Core.
 *
 * Eyebrow + title + optional sub line on the left, optional right slot
 * for filters / actions. Mirrors the marketing-side OperatorPageHeader
 * so both surfaces feel like one product.
 */

interface Props {
  eyebrow: string;
  title: string;
  sub?: ReactNode;
  right?: ReactNode;
}

export function SurfaceHeader({ eyebrow, title, sub, right }: Props) {
  return (
    <header className="flex flex-col gap-2 border-b border-white/6 pb-4 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
          {eyebrow}
        </span>
        <h1 className="text-xl font-semibold tracking-tight text-white md:text-2xl">
          {title}
        </h1>
        {sub && <p className="max-w-[70ch] text-[12.5px] text-white/55">{sub}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </header>
  );
}

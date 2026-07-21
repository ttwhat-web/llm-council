import type { ReactNode } from "react";

/**
 * Shared header for operator surfaces. Eyebrow tag + title + optional
 * sub-line + optional right-side slot for filters / actions. Keeps the
 * five top-level pages visually consistent.
 */

interface Props {
  eyebrow: string;
  title: string;
  sub?: ReactNode;
  right?: ReactNode;
}

export function OperatorPageHeader({ eyebrow, title, sub, right }: Props) {
  return (
    <header className="relative flex flex-col gap-3 pb-5 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-1.5">
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.24em] text-accent">
          <span
            aria-hidden
            className="inline-block h-1 w-1 rounded-full bg-accent shadow-[0_0_6px_1px_rgba(164,144,194,0.6)]"
          />
          {eyebrow}
        </span>
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-white md:text-[28px]">
          {title}
        </h1>
        {sub && (
          <p className="max-w-[68ch] text-[12.5px] leading-relaxed text-white/60">
            {sub}
          </p>
        )}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
      <span aria-hidden className="accent-hairline absolute inset-x-0 bottom-0" />
    </header>
  );
}

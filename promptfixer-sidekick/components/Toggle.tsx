"use client";

import clsx from "clsx";

interface Props {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, hint, disabled }: Props) {
  return (
    <label
      className={clsx(
        "no-drag flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/6 bg-white/[0.03] px-3 py-2 transition hover:bg-white/[0.05]",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      <span className="flex flex-col">
        <span className="text-sm font-medium text-white/90">{label}</span>
        {hint && <span className="text-[11px] text-white/45">{hint}</span>}
      </span>
      <span
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        className={clsx(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition",
          checked ? "bg-accent shadow-glow" : "bg-white/10"
        )}
      >
        <span
          className={clsx(
            "inline-block h-4 w-4 transform rounded-full bg-white transition",
            checked ? "translate-x-[18px]" : "translate-x-[2px]"
          )}
        />
      </span>
    </label>
  );
}

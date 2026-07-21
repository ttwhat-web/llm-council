"use client";

import clsx from "clsx";

interface Tab {
  id: string;
  label: string;
  title?: string;
}

interface Props {
  tabs: Tab[];
  active: string;
  onChange(id: string): void;
  ariaLabel: string;
}

export function PanelTabs({ tabs, active, onChange, ariaLabel }: Props) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex items-center gap-0.5 rounded-md border border-white/10 bg-white/[0.03] p-0.5"
    >
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            title={t.title ?? `${t.label} · WORKS`}
            className={clsx(
              "rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider transition",
              isActive ? "bg-accent/[0.18] text-accent" : "text-white/55 hover:bg-white/[0.07]"
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

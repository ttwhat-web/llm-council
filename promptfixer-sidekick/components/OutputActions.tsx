"use client";

import clsx from "clsx";
import { Loader2 } from "lucide-react";
import { ACTION_LIST } from "@/lib/actions";
import type { OutputAction } from "@/lib/types";

interface Props {
  onAction: (action: OutputAction) => void;
  busyAction?: OutputAction | null;
  disabled?: boolean;
  compact?: boolean;
}

export function OutputActions({ onAction, busyAction, disabled, compact }: Props) {
  const transform = ACTION_LIST.filter((a) => a.group === "transform");
  const convert = ACTION_LIST.filter((a) => a.group === "convert");

  return (
    <div className="flex flex-col gap-2">
      <Group label="Transform" compact={compact}>
        {transform.map((a) => (
          <Pill
            key={a.id}
            label={compact ? a.short : a.label}
            busy={busyAction === a.id}
            disabled={Boolean(disabled || busyAction)}
            onClick={() => onAction(a.id)}
          />
        ))}
      </Group>
      <Group label="Convert" compact={compact}>
        {convert.map((a) => (
          <Pill
            key={a.id}
            label={compact ? a.short : a.label}
            busy={busyAction === a.id}
            disabled={Boolean(disabled || busyAction)}
            onClick={() => onAction(a.id)}
          />
        ))}
      </Group>
    </div>
  );
}

function Group({
  label,
  compact,
  children
}: {
  label: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={clsx("flex flex-wrap items-center gap-1.5", compact && "gap-1")}>
      <span className="text-[10px] uppercase tracking-wider text-white/40">{label}</span>
      {children}
    </div>
  );
}

function Pill({
  label,
  busy,
  disabled,
  onClick
}: {
  label: string;
  busy?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "no-drag inline-flex items-center gap-1 rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-white/80 transition",
        "hover:border-white/12 hover:bg-white/[0.06] hover:text-white",
        "disabled:cursor-not-allowed disabled:opacity-40"
      )}
    >
      {busy && <Loader2 className="h-3 w-3 animate-spin" />}
      {label}
    </button>
  );
}

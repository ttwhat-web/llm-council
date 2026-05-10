"use client";

import clsx from "clsx";
import { Bell, Lock } from "lucide-react";

/**
 * Pro-only toggle for Mission Alerts (Telegram BotFather notifications).
 *
 * Two states:
 *   - feature-enabled (NEXT_PUBLIC_MISSION_ALERTS_ENABLED === "true"):
 *       renders a real toggle. The user opts in per-session for soft
 *       failure cases. Hard failures alert admin-only regardless.
 *   - feature-disabled (default):
 *       renders a locked card with a "Pro" pill. Click is a no-op for
 *       now (auth/billing not wired yet) — the marketing copy in
 *       Pricing.tsx explains the upgrade path.
 *
 * The bot token + chat id are server-side only; the client only sees
 * the public flag.
 */

interface Props {
  enabled: boolean;
  onChange: (next: boolean) => void;
  /** Surface-level kill switch — usually NEXT_PUBLIC_MISSION_ALERTS_ENABLED. */
  unlocked?: boolean;
  compact?: boolean;
}

export function MissionAlertToggle({ enabled, onChange, unlocked, compact }: Props) {
  if (!unlocked) {
    return (
      <div
        className={clsx(
          "flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2",
          compact && "px-2.5 py-1.5"
        )}
      >
        <span className="flex items-center gap-2 text-white/60">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          <span className="flex flex-col leading-tight">
            <span className="text-[12px] font-medium text-white/80">
              Telegram Mission Alerts
            </span>
            <span className="text-[10px] text-white/45">
              Notify me when a mission needs human action.
            </span>
          </span>
        </span>
        <span className="rounded-md border border-accent/35 bg-accent/[0.1] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.2em] text-accent">
          Pro
        </span>
      </div>
    );
  }

  return (
    <label
      className={clsx(
        "no-drag flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2 transition hover:bg-white/[0.04]",
        compact && "px-2.5 py-1.5"
      )}
    >
      <span className="flex items-center gap-2">
        <Bell className="h-3.5 w-3.5 shrink-0 text-accent/85" />
        <span className="flex flex-col leading-tight">
          <span className="text-[12px] font-medium text-white/85">
            Telegram Mission Alerts
          </span>
          <span className="text-[10px] text-white/45">
            Notify me when a mission needs human action.
          </span>
        </span>
      </span>
      <span
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={clsx(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition",
          enabled ? "bg-accent shadow-glow" : "bg-white/10"
        )}
      >
        <span
          className={clsx(
            "inline-block h-4 w-4 transform rounded-full bg-white transition",
            enabled ? "translate-x-[18px]" : "translate-x-[2px]"
          )}
        />
      </span>
    </label>
  );
}

"use client";

/**
 * AtlasOrb · a premium central "presence" orb for Operator.Center.
 *
 * This is intentionally NOT an assistant chat window — it is an ambient,
 * alive-feeling presence. A slow breathing core + soft layered glow + a
 * faint orbit ring convey state without animating any data. Each `mode`
 * shifts the glow hue + intensity:
 *
 *   · accent  (the house blue)  → idle · watching · reasoning · mission ·
 *                                 market · voice · general · research ·
 *                                 coding · replay
 *   · emerald (ready / live)    → listening
 *   · amber   (caution)         → risk
 *
 * The component is fully self-contained: all keyframes are scoped to a
 * generated class via an inline <style> tag, so it can be dropped anywhere
 * without global CSS. Nothing here captures audio, reads the network, or
 * touches storage — it is pure presentation driven by props.
 */

import { useId } from "react";
import clsx from "clsx";

export type AtlasOrbMode =
  | "idle"
  | "watching"
  | "listening"
  | "reasoning"
  | "mission"
  | "market"
  | "voice"
  | "general"
  | "research"
  | "coding"
  | "replay"
  | "risk";

type Hue = "accent" | "emerald" | "amber";

interface ModeStyle {
  /** Glow hue family. */
  hue: Hue;
  /** 0..1 — how energetic the breathing + glow feels. */
  intensity: number;
  /** Breathing cycle duration (s). Lower = more alert. */
  breath: number;
}

const MODE_STYLES: Record<AtlasOrbMode, ModeStyle> = {
  idle: { hue: "accent", intensity: 0.4, breath: 7 },
  watching: { hue: "accent", intensity: 0.55, breath: 5.5 },
  listening: { hue: "emerald", intensity: 0.95, breath: 2.8 },
  reasoning: { hue: "accent", intensity: 0.85, breath: 3.4 },
  mission: { hue: "accent", intensity: 0.8, breath: 4 },
  market: { hue: "accent", intensity: 0.72, breath: 4.4 },
  voice: { hue: "accent", intensity: 0.7, breath: 4.2 },
  general: { hue: "accent", intensity: 0.6, breath: 5 },
  research: { hue: "accent", intensity: 0.68, breath: 4.6 },
  coding: { hue: "accent", intensity: 0.74, breath: 4.2 },
  replay: { hue: "accent", intensity: 0.5, breath: 6 },
  risk: { hue: "amber", intensity: 0.9, breath: 3 }
};

/**
 * Hue → concrete colors. We lean on the design tokens (CSS custom
 * properties) so the orb tracks the house accent automatically.
 */
const HUE_COLORS: Record<Hue, { core: string; glow: string; ring: string }> = {
  accent: {
    core: "var(--pr-color-accent, #7c9bff)",
    glow: "var(--pr-color-accent-glow, rgba(124,155,255,0.45))",
    ring: "rgba(124,155,255,0.55)"
  },
  emerald: {
    core: "var(--pr-color-emerald, #34d399)",
    glow: "var(--pr-color-emerald-glow, rgba(52,211,153,0.45))",
    ring: "rgba(52,211,153,0.55)"
  },
  amber: {
    core: "var(--pr-color-amber, #fbbf24)",
    glow: "var(--pr-color-amber-glow, rgba(251,191,36,0.45))",
    ring: "rgba(251,191,36,0.55)"
  }
};

const SIZES = {
  sm: 88,
  md: 140,
  lg: 184
} as const;

export type AtlasOrbSize = keyof typeof SIZES | number;

export function AtlasOrb({
  mode = "idle",
  label,
  size = "md"
}: {
  mode?: AtlasOrbMode;
  /** Optional caption shown under the orb (uppercase mono). */
  label?: string;
  /** "sm" | "md" | "lg" or an explicit pixel diameter. */
  size?: AtlasOrbSize;
}) {
  const reactId = useId();
  // useId can include ":" which is invalid in a CSS class — sanitize it.
  const cls = `atlas-orb-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const px = typeof size === "number" ? size : SIZES[size];
  const style = MODE_STYLES[mode];
  const colors = HUE_COLORS[style.hue];

  // Map intensity → animation feel. Higher intensity breathes a touch more
  // and glows brighter; everything stays subtle (this is presence, not a UI
  // spinner).
  const breathScale = 1 + 0.04 + style.intensity * 0.05; // peak scale
  const glowMin = 14 + style.intensity * 10;
  const glowMax = 28 + style.intensity * 34;
  const ringOpacity = 0.18 + style.intensity * 0.22;

  return (
    <div
      className={clsx(cls, "relative inline-flex items-center justify-center")}
      style={{ width: px, height: px }}
      data-mode={mode}
      role="img"
      aria-label={label ? `Atlas · ${label}` : `Atlas · ${mode}`}
    >
      {/* ambient outer glow */}
      <span className={`${cls}__aura pointer-events-none absolute inset-0 rounded-full`} aria-hidden />
      {/* slow orbit ring */}
      <span className={`${cls}__ring pointer-events-none absolute rounded-full`} aria-hidden />
      {/* breathing core */}
      <span className={`${cls}__core pointer-events-none absolute rounded-full`} aria-hidden>
        <span className={`${cls}__sheen absolute rounded-full`} aria-hidden />
      </span>
      {/* tiny living center spark */}
      <span className={`${cls}__spark pointer-events-none absolute rounded-full`} aria-hidden />

      {label && (
        <span className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.28em] text-white/55">
          {label}
        </span>
      )}

      <style>{`
        .${cls} { isolation: isolate; }
        .${cls}__aura {
          background: radial-gradient(circle at 50% 50%, ${colors.glow} 0%, transparent 68%);
          filter: blur(6px);
          animation: ${cls}-breathe ${style.breath}s ease-in-out infinite;
        }
        .${cls}__ring {
          inset: 8%;
          border: 1px solid ${colors.ring};
          opacity: ${ringOpacity.toFixed(3)};
          box-shadow: 0 0 ${glowMin.toFixed(1)}px ${colors.glow} inset;
          animation: ${cls}-spin 22s linear infinite;
        }
        .${cls}__core {
          inset: 20%;
          background:
            radial-gradient(circle at 38% 32%, rgba(255,255,255,0.22) 0%, transparent 42%),
            radial-gradient(circle at 50% 55%, ${colors.core} 0%, rgba(0,0,0,0.35) 78%);
          border: 1px solid ${colors.ring};
          box-shadow: 0 0 ${glowMin.toFixed(1)}px ${colors.glow};
          animation:
            ${cls}-breathe ${style.breath}s ease-in-out infinite,
            ${cls}-pulse ${style.breath}s ease-in-out infinite;
        }
        .${cls}__sheen {
          inset: 0;
          background: radial-gradient(circle at 36% 28%, rgba(255,255,255,0.30) 0%, transparent 40%);
          mix-blend-mode: screen;
        }
        .${cls}__spark {
          width: 10%;
          height: 10%;
          background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, ${colors.core} 60%, transparent 75%);
          box-shadow: 0 0 12px ${colors.glow};
          animation: ${cls}-spark ${(style.breath / 1.6).toFixed(2)}s ease-in-out infinite;
        }
        @keyframes ${cls}-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(${breathScale.toFixed(3)}); }
        }
        @keyframes ${cls}-pulse {
          0%, 100% { box-shadow: 0 0 ${glowMin.toFixed(1)}px ${colors.glow}; }
          50% { box-shadow: 0 0 ${glowMax.toFixed(1)}px ${colors.glow}; }
        }
        @keyframes ${cls}-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ${cls}-spark {
          0%, 100% { opacity: 0.55; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        @media (prefers-reduced-motion: reduce) {
          .${cls}__aura, .${cls}__ring, .${cls}__core, .${cls}__spark {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

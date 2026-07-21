/**
 * Mirrored design tokens for use in TypeScript (Framer Motion variants,
 * inline-style fallbacks, charts). Keep this file in sync with tokens.css.
 */

export const tokens = {
  color: {
    graphite: {
      50: "#f5f6f8",
      100: "#e9ebf1",
      200: "#d2d5de",
      300: "#a4a8b3",
      400: "#6f7380",
      500: "#494d59",
      600: "#2c3140",
      700: "#181c25",
      800: "#11141b",
      900: "#0b0d12",
      950: "#06070a"
    },
    accent: "#7c9bff",
    accentSoft: "#b3c4ff",
    accentGlow: "rgba(124,155,255,0.45)",
    emerald: "#34d399",
    amber: "#fbbf24",
    rose: "#f87171"
  },
  radius: {
    xs: 4,
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
    "2xl": 28,
    pill: 999
  },
  duration: {
    instant: 80,
    fast: 140,
    base: 200,
    slow: 280,
    cinematic: 420
  },
  easing: {
    snap: [0.2, 0.8, 0.2, 1] as const,
    precise: [0.4, 0.0, 0.2, 1] as const,
    decel: [0, 0, 0.2, 1] as const
  }
} as const;

export type Tokens = typeof tokens;

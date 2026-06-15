/**
 * Theme store · Phase 13.
 *
 * Five built-in palettes that swap the operator surface tone without
 * touching component code. Each palette flips the canvas background,
 * accent color (drives glows / links / nav active state / graph nodes),
 * and the soft border tone.
 *
 * Implementation: writes CSS custom properties on <html>. Tailwind reads
 * the `accent` token via `theme.extend.colors.accent` (a `var(--accent)`
 * reference set in tokens.css). The values below shadow the default
 * tokens; switching theme is a single setProperty().
 *
 * Persisted to localStorage so the choice survives reload.
 */

import { create } from "zustand";

export type ThemeId =
  | "midnight"
  | "graphite"
  | "deep-navy"
  | "violet"
  | "emerald"
  | "terminal"
  | "amber-terminal"
  | "founder"
  | "night-ops"
  | "travel"
  | "crypto"
  | "export"
  | "minimal"
  // Theme 2.0 · UX-X
  | "midnight-operator"
  | "graph-paper"
  | "dark-glass"
  | "atlas-blue"
  | "trading-night"
  | "warm-focus-theme"
  | "low-light";

export type BackgroundId =
  | "static"
  | "grid"
  | "blueprint"
  | "market"
  | "glass"
  | "holo"
  | "graph"
  | "calm-graph"
  | "soft-grid"
  | "midnight-glass"
  | "warm-focus"
  | "low-contrast"
  // Theme 2.0 · animated (UX-X)
  | "animated-grid"
  | "market-dots"
  | "slow-graph"
  | "signal-field"
  | "soft-stars";

export const BACKGROUNDS: Array<{ id: BackgroundId; label: string }> = [
  // animated · Theme 2.0 (premium · calm)
  { id: "animated-grid", label: "Animated Grid" },
  { id: "market-dots", label: "Market Dots" },
  { id: "slow-graph", label: "Slow Graph" },
  { id: "signal-field", label: "Signal Field" },
  { id: "soft-stars", label: "Soft Stars" },
  // calmer presets · easier on the eyes
  { id: "soft-grid", label: "Soft Grid" },
  { id: "calm-graph", label: "Calm Graph" },
  { id: "midnight-glass", label: "Midnight Glass" },
  { id: "warm-focus", label: "Warm Focus" },
  { id: "low-contrast", label: "Low Contrast" },
  { id: "static", label: "Static" },
  { id: "grid", label: "Grid" },
  { id: "blueprint", label: "Blueprint" },
  { id: "market", label: "Market" },
  { id: "glass", label: "Glass" },
  { id: "holo", label: "Holo" },
  { id: "graph", label: "Graph" }
];

export interface ThemePalette {
  id: ThemeId;
  label: string;
  bg: string;
  panel: string;
  accent: string;
  accentSoft: string;
  glow: string;
  swatch: string;
}

export const THEMES: ThemePalette[] = [
  {
    id: "midnight",
    label: "Midnight",
    bg: "#06080d",
    panel: "rgba(255,255,255,0.018)",
    accent: "#7c9bff",
    accentSoft: "rgba(124,155,255,0.18)",
    glow: "0 0 24px 2px rgba(124,155,255,0.18)",
    swatch: "linear-gradient(135deg,#06080d 0%,#7c9bff 100%)"
  },
  {
    id: "graphite",
    label: "Graphite",
    bg: "#0b0c10",
    panel: "rgba(255,255,255,0.02)",
    accent: "#cfd6e4",
    accentSoft: "rgba(207,214,228,0.18)",
    glow: "0 0 24px 2px rgba(207,214,228,0.16)",
    swatch: "linear-gradient(135deg,#0b0c10 0%,#cfd6e4 100%)"
  },
  {
    id: "deep-navy",
    label: "Deep Navy",
    bg: "#05091a",
    panel: "rgba(70,110,200,0.04)",
    accent: "#5d8bff",
    accentSoft: "rgba(93,139,255,0.2)",
    glow: "0 0 26px 2px rgba(93,139,255,0.22)",
    swatch: "linear-gradient(135deg,#05091a 0%,#5d8bff 100%)"
  },
  {
    id: "violet",
    label: "Violet",
    bg: "#0a0612",
    panel: "rgba(160,120,255,0.04)",
    accent: "#b486ff",
    accentSoft: "rgba(180,134,255,0.2)",
    glow: "0 0 26px 2px rgba(180,134,255,0.22)",
    swatch: "linear-gradient(135deg,#0a0612 0%,#b486ff 100%)"
  },
  {
    id: "emerald",
    label: "Emerald",
    bg: "#06120c",
    panel: "rgba(100,200,150,0.04)",
    accent: "#5fd9a3",
    accentSoft: "rgba(95,217,163,0.2)",
    glow: "0 0 26px 2px rgba(95,217,163,0.2)",
    swatch: "linear-gradient(135deg,#06120c 0%,#5fd9a3 100%)"
  },
  {
    id: "terminal",
    label: "Terminal",
    bg: "#04070a",
    panel: "rgba(80,255,170,0.03)",
    accent: "#46f5a0",
    accentSoft: "rgba(70,245,160,0.16)",
    glow: "0 0 24px 2px rgba(70,245,160,0.18)",
    swatch: "linear-gradient(135deg,#04070a 0%,#46f5a0 100%)"
  },
  {
    id: "amber-terminal",
    label: "Amber Terminal",
    bg: "#0a0500",
    panel: "rgba(255,160,40,0.04)",
    accent: "#ffa928",
    accentSoft: "rgba(255,169,40,0.18)",
    glow: "0 0 26px 2px rgba(255,169,40,0.2)",
    swatch: "linear-gradient(135deg,#0a0500 0%,#ffa928 100%)"
  },
  {
    id: "founder",
    label: "Founder",
    bg: "#0b0710",
    panel: "rgba(255,215,120,0.04)",
    accent: "#f5c451",
    accentSoft: "rgba(245,196,81,0.18)",
    glow: "0 0 26px 2px rgba(245,196,81,0.2)",
    swatch: "linear-gradient(135deg,#0b0710 0%,#f5c451 100%)"
  },
  {
    id: "night-ops",
    label: "Night Ops",
    bg: "#02040a",
    panel: "rgba(90,130,255,0.03)",
    accent: "#4d6bff",
    accentSoft: "rgba(77,107,255,0.16)",
    glow: "0 0 24px 2px rgba(77,107,255,0.18)",
    swatch: "linear-gradient(135deg,#02040a 0%,#4d6bff 100%)"
  },
  {
    id: "travel",
    label: "Travel",
    bg: "#04100f",
    panel: "rgba(80,210,200,0.04)",
    accent: "#3fd6c6",
    accentSoft: "rgba(63,214,198,0.18)",
    glow: "0 0 26px 2px rgba(63,214,198,0.2)",
    swatch: "linear-gradient(135deg,#04100f 0%,#3fd6c6 100%)"
  },
  {
    id: "crypto",
    label: "Crypto",
    bg: "#0d0a02",
    panel: "rgba(247,147,26,0.04)",
    accent: "#f7931a",
    accentSoft: "rgba(247,147,26,0.18)",
    glow: "0 0 26px 2px rgba(247,147,26,0.2)",
    swatch: "linear-gradient(135deg,#0d0a02 0%,#f7931a 100%)"
  },
  {
    id: "export",
    label: "Export",
    bg: "#0a0c05",
    panel: "rgba(180,210,90,0.04)",
    accent: "#b6d957",
    accentSoft: "rgba(182,217,87,0.18)",
    glow: "0 0 26px 2px rgba(182,217,87,0.2)",
    swatch: "linear-gradient(135deg,#0a0c05 0%,#b6d957 100%)"
  },
  {
    id: "minimal",
    label: "Minimal",
    bg: "#0c0d0f",
    panel: "rgba(255,255,255,0.025)",
    accent: "#e6e8ee",
    accentSoft: "rgba(230,232,238,0.14)",
    glow: "0 0 20px 2px rgba(230,232,238,0.12)",
    swatch: "linear-gradient(135deg,#0c0d0f 0%,#e6e8ee 100%)"
  },
  // ---- Theme 2.0 · UX-X --------------------------------------------------
  {
    id: "midnight-operator",
    label: "Midnight Operator",
    bg: "#05070e",
    panel: "rgba(124,155,255,0.03)",
    accent: "#8aa6ff",
    accentSoft: "rgba(138,166,255,0.16)",
    glow: "0 0 24px 2px rgba(138,166,255,0.18)",
    swatch: "linear-gradient(135deg,#05070e 0%,#8aa6ff 100%)"
  },
  {
    id: "graph-paper",
    label: "Graph Paper",
    bg: "#0a0b0d",
    panel: "rgba(255,255,255,0.022)",
    accent: "#9fb3c8",
    accentSoft: "rgba(159,179,200,0.15)",
    glow: "0 0 20px 2px rgba(159,179,200,0.12)",
    swatch: "linear-gradient(135deg,#0a0b0d 0%,#9fb3c8 100%)"
  },
  {
    id: "dark-glass",
    label: "Dark Glass",
    bg: "#070a10",
    panel: "rgba(255,255,255,0.03)",
    accent: "#a8c0ff",
    accentSoft: "rgba(168,192,255,0.16)",
    glow: "0 0 26px 2px rgba(168,192,255,0.16)",
    swatch: "linear-gradient(135deg,#070a10 0%,#a8c0ff 100%)"
  },
  {
    id: "atlas-blue",
    label: "Atlas Blue",
    bg: "#040a18",
    panel: "rgba(70,130,255,0.05)",
    accent: "#5aa0ff",
    accentSoft: "rgba(90,160,255,0.2)",
    glow: "0 0 28px 2px rgba(90,160,255,0.22)",
    swatch: "linear-gradient(135deg,#040a18 0%,#5aa0ff 100%)"
  },
  {
    id: "trading-night",
    label: "Trading Night",
    bg: "#060a08",
    panel: "rgba(95,217,163,0.04)",
    accent: "#4fd39a",
    accentSoft: "rgba(79,211,154,0.18)",
    glow: "0 0 26px 2px rgba(79,211,154,0.2)",
    swatch: "linear-gradient(135deg,#060a08 0%,#4fd39a 100%)"
  },
  {
    id: "warm-focus-theme",
    label: "Warm Focus",
    bg: "#0c0907",
    panel: "rgba(245,196,120,0.04)",
    accent: "#f0b970",
    accentSoft: "rgba(240,185,112,0.16)",
    glow: "0 0 24px 2px rgba(240,185,112,0.18)",
    swatch: "linear-gradient(135deg,#0c0907 0%,#f0b970 100%)"
  },
  {
    id: "low-light",
    label: "Low Light",
    bg: "#0a0b0d",
    panel: "rgba(255,255,255,0.018)",
    accent: "#8b93a7",
    accentSoft: "rgba(139,147,167,0.12)",
    glow: "0 0 16px 2px rgba(139,147,167,0.1)",
    swatch: "linear-gradient(135deg,#0a0b0d 0%,#8b93a7 100%)"
  }
];

interface ThemeState {
  id: ThemeId;
  bg: BackgroundId;
  set(id: ThemeId): void;
  setBackground(bg: BackgroundId): void;
  hydrate(): void;
}

const STORAGE_KEY = "promptready-os.theme";
const BG_KEY = "promptready-os.theme.bg";

function applyBgToDom(bg: BackgroundId) {
  if (typeof document === "undefined") return;
  document.body.dataset.bg = bg;
}

function applyToDom(p: ThemePalette) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  // Overwrite the existing design tokens so every Tailwind class that
  // reads `var(--pr-color-accent)` (text-accent, bg-accent, shadow-glow…)
  // switches instantly.
  root.style.setProperty("--pr-surface-base", p.bg);
  root.style.setProperty("--pr-color-accent", p.accent);
  root.style.setProperty("--pr-color-accent-soft", p.accentSoft);
  root.style.setProperty("--pr-color-accent-glow", p.accentSoft);
  root.dataset.theme = p.id;
}

export const useThemeStore = create<ThemeState>((set) => ({
  id: "midnight",
  bg: "soft-grid",

  set(id) {
    const p = THEMES.find((t) => t.id === id) ?? THEMES[0];
    set({ id: p.id });
    applyToDom(p);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, p.id);
      } catch {
        // ignore
      }
    }
  },

  setBackground(bg) {
    set({ bg });
    applyBgToDom(bg);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(BG_KEY, bg);
      } catch {
        // ignore
      }
    }
  },

  hydrate() {
    if (typeof window === "undefined") return;
    let id: ThemeId = "midnight";
    let bg: BackgroundId = "soft-grid";
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw && THEMES.some((t) => t.id === raw)) id = raw as ThemeId;
      const rawBg = window.localStorage.getItem(BG_KEY);
      if (rawBg && BACKGROUNDS.some((b) => b.id === rawBg)) bg = rawBg as BackgroundId;
    } catch {
      // ignore
    }
    const p = THEMES.find((t) => t.id === id) ?? THEMES[0];
    set({ id, bg });
    applyToDom(p);
    applyBgToDom(bg);
  }
}));

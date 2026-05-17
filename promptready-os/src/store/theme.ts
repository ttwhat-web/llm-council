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

export type ThemeId = "midnight" | "graphite" | "deep-navy" | "violet" | "emerald";

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
  }
];

interface ThemeState {
  id: ThemeId;
  set(id: ThemeId): void;
  hydrate(): void;
}

const STORAGE_KEY = "promptready-os.theme";

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

export const useThemeStore = create<ThemeState>((set, get) => ({
  id: "midnight",

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

  hydrate() {
    if (typeof window === "undefined") return;
    let id: ThemeId = "midnight";
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw && THEMES.some((t) => t.id === raw)) id = raw as ThemeId;
    } catch {
      // ignore
    }
    const p = THEMES.find((t) => t.id === id) ?? THEMES[0];
    set({ id });
    applyToDom(p);
  }
}));

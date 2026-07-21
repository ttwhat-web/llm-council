/**
 * Settings store · user preferences. Bootstraps synchronously from a
 * Tauri-managed config file so the rest of the UI can render without a
 * loading flash.
 */

import { create } from "zustand";
import type { AppSettings, Provider } from "@/types";

const DEFAULTS: AppSettings = {
  theme: "graphite",
  defaultMode: "general",
  defaultProvider: "auto",
  enabledProviders: [
    "claude",
    "chatgpt",
    "gemini",
    "perplexity",
    "openrouter",
    "ollama"
  ],
  overlayShortcut: "CmdOrCtrl+Shift+O",
  cmdkShortcut: "CmdOrCtrl+K",
  autosaveMs: 1500,
  telemetryConsent: false
};

interface SettingsState extends AppSettings {
  hydrated: boolean;
  hydrate(): Promise<void>;
  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void>;
  toggleProvider(p: Provider): Promise<void>;
  reset(): Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULTS,
  hydrated: false,

  async hydrate() {
    // TODO(phase-1): read from Tauri's config dir; merge over DEFAULTS.
    set({ hydrated: true });
  },

  async set(key, value) {
    set({ [key]: value } as Pick<SettingsState, typeof key>);
    // TODO(phase-1): persist via Tauri.
  },

  async toggleProvider(p) {
    const enabled = get().enabledProviders.includes(p)
      ? get().enabledProviders.filter((x) => x !== p)
      : [...get().enabledProviders, p];
    await get().set("enabledProviders", enabled);
  },

  async reset() {
    set({ ...DEFAULTS });
    // TODO(phase-1): clear settings file.
  }
}));

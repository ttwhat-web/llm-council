/**
 * UI mode · Sprint I.
 *
 * Second Screen mode: hides the side rail + top bar and lets the
 * Intelligence Terminal go full-width (broadcast wall) — suitable for a
 * projector / TV. Pure presentation state, persisted locally. No route
 * change, no runtime change.
 */

import { create } from "zustand";

const KEY = "promptready-os.ui.second-screen";

interface UiModeState {
  secondScreen: boolean;
  setSecondScreen(on: boolean): void;
  toggleSecondScreen(): void;
  hydrate(): void;
}

export const useUiModeStore = create<UiModeState>((set, get) => ({
  secondScreen: false,

  setSecondScreen(on) {
    set({ secondScreen: on });
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(KEY, on ? "1" : "0");
      } catch {
        // ignore
      }
    }
  },

  toggleSecondScreen() {
    get().setSecondScreen(!get().secondScreen);
  },

  hydrate() {
    if (typeof window === "undefined") return;
    try {
      set({ secondScreen: window.localStorage.getItem(KEY) === "1" });
    } catch {
      // ignore
    }
  }
}));

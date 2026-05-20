/**
 * UI mode · Sprint I / I.2.
 *
 * Intelligence Terminal view mode + Second Screen. Pure presentation
 * state, persisted locally. No route change, no runtime change.
 *
 *   terminal      · normal terminal (default)
 *   wall          · Live Wall cockpit (nav still visible)
 *   second-screen · hides side rail + top bar · full-width Broadcast Wall
 *
 * `wallBroadcast` is the Live Wall's own Broadcast Mode (huge headline +
 * chart for TV/projector), persisted independently.
 */

import { create } from "zustand";

export type TerminalMode = "terminal" | "wall" | "second-screen";

const KEY_SECOND = "promptready-os.ui.second-screen";
const KEY_WALL = "promptready-os.ui.live-wall";
const KEY_BROADCAST = "promptready-os.ui.wall-broadcast";

interface UiModeState {
  secondScreen: boolean;
  liveWall: boolean;
  wallBroadcast: boolean;
  mode: TerminalMode;
  setMode(mode: TerminalMode): void;
  setSecondScreen(on: boolean): void;
  toggleSecondScreen(): void;
  toggleBroadcast(): void;
  hydrate(): void;
}

function persist(key: string, on: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, on ? "1" : "0");
  } catch {
    // ignore
  }
}

function deriveMode(secondScreen: boolean, liveWall: boolean): TerminalMode {
  if (secondScreen) return "second-screen";
  if (liveWall) return "wall";
  return "terminal";
}

export const useUiModeStore = create<UiModeState>((set, get) => ({
  secondScreen: false,
  liveWall: false,
  wallBroadcast: false,
  mode: "terminal",

  setMode(mode) {
    const secondScreen = mode === "second-screen";
    const liveWall = mode === "wall";
    set({ secondScreen, liveWall, mode });
    persist(KEY_SECOND, secondScreen);
    persist(KEY_WALL, liveWall);
  },

  setSecondScreen(on) {
    get().setMode(on ? "second-screen" : "terminal");
  },

  toggleSecondScreen() {
    get().setMode(get().secondScreen ? "terminal" : "second-screen");
  },

  toggleBroadcast() {
    const next = !get().wallBroadcast;
    set({ wallBroadcast: next });
    persist(KEY_BROADCAST, next);
  },

  hydrate() {
    if (typeof window === "undefined") return;
    try {
      const secondScreen = window.localStorage.getItem(KEY_SECOND) === "1";
      const liveWall = window.localStorage.getItem(KEY_WALL) === "1";
      const wallBroadcast = window.localStorage.getItem(KEY_BROADCAST) === "1";
      set({
        secondScreen,
        liveWall: secondScreen ? false : liveWall,
        wallBroadcast,
        mode: deriveMode(secondScreen, liveWall)
      });
    } catch {
      // ignore
    }
  }
}));

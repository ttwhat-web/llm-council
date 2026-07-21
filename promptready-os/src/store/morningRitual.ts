"use client";

/**
 * Morning Ritual · has the founder ever seen the first-morning ceremony.
 *
 * One flag, persisted, nothing else. The ritual (staged progress →
 * ceremonial summary → "Review Morning") is real work Operator was
 * already going to do the moment Gmail + Calendar connect — this
 * store only remembers whether it's already been shown once, so it
 * never replays on every reload once the founder has moved past it.
 */

import { create } from "zustand";

const STORAGE_KEY = "operator.morningRitual.seen";

function readSeen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

interface MorningRitualState {
  seen: boolean;
  markSeen(): void;
}

export const useMorningRitualStore = create<MorningRitualState>((set) => ({
  seen: readSeen(),
  markSeen() {
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    set({ seen: true });
  }
}));

"use client";

/**
 * Operator Memory · v0 store.
 *
 * The founder's profile of themselves — name, companies, customers,
 * projects, markets, tone, things to remember, things to avoid.
 * Lives in localStorage on this device (encrypted at rest later).
 * Edited from Settings → Memory. Read by the drafting service and
 * (later) the briefing narrator + voice TTS to keep Operator
 * grounded in the founder's reality instead of generic AI advice.
 *
 * v0 contract:
 *   * one global memory per device (multi-tenant later)
 *   * partial updates · setField(key, value) merges into current
 *   * full reset (back to EMPTY_MEMORY)
 *   * export / import JSON (download/upload, no cloud)
 *
 * Demo mode loads DEMO_FOUNDER_SEED at the UI layer — never at the
 * store layer, so writes from the user can't accidentally land on
 * top of demo data.
 */

import { create } from "zustand";
import {
  EMPTY_MEMORY,
  isMemoryPopulated,
  type FounderMemory
} from "@/services/operator/memorySeed";

const STORAGE_KEY = "operator.memory.v0";
const STORAGE_UPDATED_KEY = "operator.memory.v0.updatedAt";

function readMemory(): FounderMemory {
  if (typeof window === "undefined") return { ...EMPTY_MEMORY };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_MEMORY };
    const parsed = JSON.parse(raw) as Partial<FounderMemory>;
    return {
      firstName: typeof parsed.firstName === "string" ? parsed.firstName : undefined,
      fullName: typeof parsed.fullName === "string" ? parsed.fullName : undefined,
      preferredLanguage:
        typeof parsed.preferredLanguage === "string" ? parsed.preferredLanguage : undefined,
      tonePreference:
        typeof parsed.tonePreference === "string" ? parsed.tonePreference : undefined,
      companies: Array.isArray(parsed.companies) ? parsed.companies.filter(isString) : [],
      keyCustomers: Array.isArray(parsed.keyCustomers) ? parsed.keyCustomers.filter(isString) : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects.filter(isString) : [],
      importantMarkets: Array.isArray(parsed.importantMarkets)
        ? parsed.importantMarkets.filter(isString)
        : [],
      communicationRules:
        typeof parsed.communicationRules === "string" ? parsed.communicationRules : "",
      rememberThese: typeof parsed.rememberThese === "string" ? parsed.rememberThese : "",
      avoidThese: typeof parsed.avoidThese === "string" ? parsed.avoidThese : ""
    };
  } catch {
    return { ...EMPTY_MEMORY };
  }
}

function isString(x: unknown): x is string {
  return typeof x === "string" && x.trim().length > 0;
}

function writeMemory(m: FounderMemory): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
    window.localStorage.setItem(STORAGE_UPDATED_KEY, String(Date.now()));
  } catch {
    /* quota */
  }
}

function readUpdatedAt(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_UPDATED_KEY);
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export interface OperatorMemoryState {
  memory: FounderMemory;
  updatedAt: number | null;
  setMemory(patch: Partial<FounderMemory>): void;
  reset(): void;
  exportJson(): string;
  importJson(json: string): { ok: true } | { ok: false; error: string };
  isPopulated(): boolean;
}

export const useOperatorMemoryStore = create<OperatorMemoryState>((set, get) => ({
  memory: readMemory(),
  updatedAt: readUpdatedAt(),

  setMemory(patch) {
    const next: FounderMemory = { ...get().memory, ...patch };
    writeMemory(next);
    set({ memory: next, updatedAt: Date.now() });
  },

  reset() {
    writeMemory({ ...EMPTY_MEMORY });
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_UPDATED_KEY);
      } catch {
        /* ignore */
      }
    }
    set({ memory: { ...EMPTY_MEMORY }, updatedAt: null });
  },

  exportJson() {
    return JSON.stringify(get().memory, null, 2);
  },

  importJson(json) {
    try {
      const parsed = JSON.parse(json);
      if (!parsed || typeof parsed !== "object") {
        return { ok: false, error: "Memory file must be a JSON object." };
      }
      const next: FounderMemory = {
        ...EMPTY_MEMORY,
        ...(parsed as Partial<FounderMemory>),
        companies: Array.isArray(parsed.companies) ? parsed.companies.filter(isString) : [],
        keyCustomers: Array.isArray(parsed.keyCustomers) ? parsed.keyCustomers.filter(isString) : [],
        projects: Array.isArray(parsed.projects) ? parsed.projects.filter(isString) : [],
        importantMarkets: Array.isArray(parsed.importantMarkets)
          ? parsed.importantMarkets.filter(isString)
          : []
      };
      writeMemory(next);
      set({ memory: next, updatedAt: Date.now() });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },

  isPopulated() {
    return isMemoryPopulated(get().memory);
  }
}));

/** Synchronous accessor for services that don't use React. */
export function readMemoryNow(): FounderMemory {
  return readMemory();
}

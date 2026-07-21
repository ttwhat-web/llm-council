"use client";

/**
 * AI provider store · BYOK keys + model selection.
 *
 * One source of truth for "is there an LLM available?". The drafting
 * service reads from this store; the Settings BYOK rows write to it.
 * Keys are persisted in localStorage on this device only (matches
 * the rest of the app — Sources card already documents this; the
 * encryption pre-billing commitment covers both).
 *
 * Today only Anthropic is wired (Claude Haiku for cost/speed on
 * short drafting tasks). OpenAI / Ollama plug into the same shape
 * when we light them up.
 */

import { create } from "zustand";

type ProviderId = "anthropic";

interface AiProviderState {
  anthropicKey: string | null;
  saveKey(provider: ProviderId, key: string): void;
  clearKey(provider: ProviderId): void;
  hasAnyKey(): boolean;
}

const STORAGE_PREFIX = "operator.ai-provider.";

function readKey(provider: ProviderId): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_PREFIX + provider);
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

function writeKey(provider: ProviderId, key: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (key === null || key === "") {
      window.localStorage.removeItem(STORAGE_PREFIX + provider);
    } else {
      window.localStorage.setItem(STORAGE_PREFIX + provider, key);
    }
  } catch {
    /* quota */
  }
}

export const useAiProviderStore = create<AiProviderState>((set, get) => ({
  anthropicKey: readKey("anthropic"),

  saveKey(provider, key) {
    const trimmed = key.trim();
    writeKey(provider, trimmed);
    if (provider === "anthropic") set({ anthropicKey: trimmed || null });
  },

  clearKey(provider) {
    writeKey(provider, null);
    if (provider === "anthropic") set({ anthropicKey: null });
  },

  hasAnyKey() {
    return !!get().anthropicKey;
  }
}));

/** Synchronous read for use outside React (services). */
export function readAnthropicKey(): string | null {
  return readKey("anthropic");
}

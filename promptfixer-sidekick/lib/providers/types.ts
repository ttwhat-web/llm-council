import type { ProviderHealth, ProviderResult } from "../types";

export interface GenerateOptions {
  system?: string;
  temperature?: number;
  timeoutMs?: number;
  json?: boolean;
  tier?: "free" | "pro";
}

export interface Provider {
  id: "cloud" | "ollama" | "deterministic";
  label: string;
  isConfigured(): boolean;
  generate(prompt: string, options?: GenerateOptions): Promise<ProviderResult>;
  health(): Promise<ProviderHealth>;
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

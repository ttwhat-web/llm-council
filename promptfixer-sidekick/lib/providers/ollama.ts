/**
 * Ollama provider — only hits a configured Ollama daemon.
 *
 * IMPORTANT: this is opt-in. The VPS is NOT meant to host heavy models.
 * Configure OLLAMA_BASE_URL only on machines that actually run `ollama serve`
 * (developer laptops, the bundled Tauri desktop shell, or a dedicated GPU box).
 */

import type { ProviderHealth, ProviderResult } from "../types";
import { fetchWithTimeout, type GenerateOptions, type Provider } from "./types";

// Accept both env names for back-compat with the v1 layout.
const HOST = (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_HOST || "").trim();
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "gemma2:2b";
const FALLBACKS = (process.env.OLLAMA_FALLBACKS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 12000);

function isLocalhost(url: string): boolean {
  return /^https?:\/\/(127\.0\.0\.1|localhost|0\.0\.0\.0|\[::1\])/i.test(url);
}

export const ollamaProvider: Provider = {
  id: "ollama",
  label: "Local Ollama",

  isConfigured() {
    return HOST.length > 0;
  },

  async health(): Promise<ProviderHealth> {
    if (!HOST) {
      return {
        id: "ollama",
        configured: false,
        reachable: false,
        error: "OLLAMA_BASE_URL not set."
      };
    }
    try {
      const res = await fetchWithTimeout(`${HOST}/api/tags`, { method: "GET" }, 1500);
      if (!res.ok) {
        return {
          id: "ollama",
          configured: true,
          reachable: false,
          endpoint: HOST,
          error: `HTTP ${res.status}`
        };
      }
      const data = (await res.json()) as { models?: Array<{ name: string }> };
      const models = (data.models || []).map((m) => m.name);
      return {
        id: "ollama",
        configured: true,
        reachable: true,
        endpoint: HOST,
        model: DEFAULT_MODEL,
        models
      };
    } catch (err) {
      return {
        id: "ollama",
        configured: true,
        reachable: false,
        endpoint: HOST,
        error: (err as Error).message
      };
    }
  },

  async generate(prompt: string, options: GenerateOptions = {}): Promise<ProviderResult> {
    if (!HOST) {
      return {
        ok: false,
        providerId: "ollama",
        model: "",
        content: "",
        latencyMs: 0,
        error: "ollama not configured (set OLLAMA_BASE_URL)"
      };
    }

    // Soft warning surface: in production, refuse to use a non-local Ollama unless
    // the operator explicitly opted in by setting OLLAMA_ALLOW_REMOTE=1.
    if (
      !isLocalhost(HOST) &&
      process.env.NODE_ENV === "production" &&
      process.env.OLLAMA_ALLOW_REMOTE !== "1"
    ) {
      return {
        ok: false,
        providerId: "ollama",
        model: "",
        content: "",
        latencyMs: 0,
        error: "remote Ollama disabled in production (set OLLAMA_ALLOW_REMOTE=1 to override)"
      };
    }

    const candidates = uniq([DEFAULT_MODEL, ...FALLBACKS]);
    let lastErr: string | undefined;

    for (const model of candidates) {
      const start = Date.now();
      try {
        const res = await fetchWithTimeout(
          `${HOST}/api/generate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model,
              prompt,
              system: options.system,
              stream: false,
              format: options.json ? "json" : undefined,
              options: {
                temperature: options.temperature ?? 0.2
              }
            })
          },
          options.timeoutMs ?? TIMEOUT_MS
        );

        if (!res.ok) {
          lastErr = `HTTP ${res.status} from ${model}`;
          continue;
        }

        const data = (await res.json()) as { response?: string; error?: string };
        if (data.error) {
          lastErr = `${model}: ${data.error}`;
          continue;
        }

        return {
          ok: true,
          providerId: "ollama",
          model,
          content: (data.response ?? "").trim(),
          latencyMs: Date.now() - start
        };
      } catch (err) {
        lastErr = `${model}: ${(err as Error).message}`;
      }
    }

    return {
      ok: false,
      providerId: "ollama",
      model: candidates[0],
      content: "",
      latencyMs: 0,
      error: lastErr || "no ollama backend reachable"
    };
  }
};

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

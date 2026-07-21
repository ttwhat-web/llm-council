/**
 * Ollama provider — only hits a configured Ollama daemon.
 *
 * IMPORTANT: this is opt-in. The VPS is NOT meant to host heavy models.
 * Configure OLLAMA_BASE_URL only on machines that actually run `ollama serve`
 * (developer laptops, the bundled Tauri desktop shell, or a dedicated GPU box).
 *
 * Local model strategy — four named profiles, each independently configurable:
 *
 *   OLLAMA_FAST_MODEL    fast fallback / low-resource     default: gemma2:2b
 *   OLLAMA_SMART_MODEL   smart supervisor                 default: gemma4
 *   OLLAMA_CODER_MODEL   code / terminal / AS400          default: qwen2.5-coder:7b
 *   OLLAMA_AGENT_MODEL   agent experiments                default: hermes3
 *
 * `gemma2:2b` is positioned as a *fast fallback* only. The default smart
 * model for local supervision is gemma4. Callers (lib/quality.ts) pick
 * which profile to use based on the user's quality selection and pass the
 * model id as `options.model`. When no override is given, the provider
 * defaults to OLLAMA_FAST_MODEL.
 *
 * If the chosen model is not installed, the provider falls through to
 * OLLAMA_FALLBACKS (comma-separated). If every candidate fails, the
 * router falls through to deterministic — and never to cloud unless the
 * caller explicitly opted in via allowCloudFallback.
 */

import type { ProviderHealth, ProviderResult } from "../types";
import { fetchWithTimeout, type GenerateOptions, type Provider } from "./types";

const HOST = (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_HOST || "").trim();

// Profile-based env. OLLAMA_MODEL kept as a back-compat alias for FAST.
const FAST_MODEL =
  process.env.OLLAMA_FAST_MODEL || process.env.OLLAMA_MODEL || "gemma2:2b";
const SMART_MODEL = process.env.OLLAMA_SMART_MODEL || "gemma4";
const CODER_MODEL = process.env.OLLAMA_CODER_MODEL || "qwen2.5-coder:7b";
const AGENT_MODEL = process.env.OLLAMA_AGENT_MODEL || "hermes3";

const FALLBACKS = (process.env.OLLAMA_FALLBACKS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 12000);

export type LocalProfile = "fast" | "smart" | "coder" | "agent";

export const OLLAMA_PROFILES: Record<LocalProfile, () => string> = {
  fast: () => FAST_MODEL,
  smart: () => SMART_MODEL,
  coder: () => CODER_MODEL,
  agent: () => AGENT_MODEL
};

export function ollamaProfileModel(profile: LocalProfile): string {
  return OLLAMA_PROFILES[profile]();
}

export function ollamaProfilesSnapshot(): Record<LocalProfile, string> {
  return {
    fast: FAST_MODEL,
    smart: SMART_MODEL,
    coder: CODER_MODEL,
    agent: AGENT_MODEL
  };
}

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
          error: `HTTP ${res.status}`,
          profiles: ollamaProfilesSnapshot()
        };
      }
      const data = (await res.json()) as { models?: Array<{ name: string }> };
      const models = (data.models || []).map((m) => m.name);
      return {
        id: "ollama",
        configured: true,
        reachable: true,
        endpoint: HOST,
        // `model` kept as the legacy headline; profile-aware UIs should read `profiles`.
        model: SMART_MODEL,
        models,
        profiles: ollamaProfilesSnapshot()
      };
    } catch (err) {
      return {
        id: "ollama",
        configured: true,
        reachable: false,
        endpoint: HOST,
        error: (err as Error).message,
        profiles: ollamaProfilesSnapshot()
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

    // Candidate chain: explicit override → fast profile → user fallbacks list.
    const requested = options.model && options.model.trim() ? [options.model.trim()] : [];
    const candidates = uniq([...requested, FAST_MODEL, ...FALLBACKS]);
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

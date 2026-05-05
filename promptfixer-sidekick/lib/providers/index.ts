/**
 * Provider router.
 *
 * Routing rules (in order):
 *   - engine = "deterministic"      → deterministic (never call out)
 *   - engine = "ollama"              → ollama if configured, else cloud, else deterministic
 *   - engine = "cloud"               → cloud   if configured, else deterministic
 *   - engine = "auto" (or default)   → cloud   if configured, else ollama, else deterministic
 *
 * The env variable AI_ENGINE pins the default when no engine is supplied
 * by the request (overriding "auto").
 *
 * Cloud calls run server-side only; Ollama is opt-in and only hit when
 * OLLAMA_BASE_URL is configured. The VPS does NOT host heavy local models.
 */

import type { Engine } from "../types";
import { cloudProvider } from "./cloud";
import { deterministicProvider } from "./deterministic";
import { ollamaProvider } from "./ollama";
import type { Provider } from "./types";

export { cloudProvider, deterministicProvider, ollamaProvider };
export type { Provider } from "./types";

const ENV_DEFAULT = (process.env.AI_ENGINE || "auto") as Engine;

export function defaultEngine(): Engine {
  return isEngine(ENV_DEFAULT) ? ENV_DEFAULT : "auto";
}

export function isEngine(value: unknown): value is Engine {
  return value === "auto" || value === "cloud" || value === "ollama" || value === "deterministic";
}

export interface RouteResult {
  provider: Provider;
  requested: Engine;
  resolved: Engine;
  fallbackUsed: boolean;
}

export function route(requested?: Engine): RouteResult {
  const ask: Engine = isEngine(requested) ? requested : defaultEngine();

  if (ask === "deterministic") {
    return { provider: deterministicProvider, requested: ask, resolved: "deterministic", fallbackUsed: false };
  }

  if (ask === "ollama") {
    if (ollamaProvider.isConfigured()) {
      return { provider: ollamaProvider, requested: ask, resolved: "ollama", fallbackUsed: false };
    }
    if (cloudProvider.isConfigured()) {
      return { provider: cloudProvider, requested: ask, resolved: "cloud", fallbackUsed: true };
    }
    return { provider: deterministicProvider, requested: ask, resolved: "deterministic", fallbackUsed: true };
  }

  if (ask === "cloud") {
    if (cloudProvider.isConfigured()) {
      return { provider: cloudProvider, requested: ask, resolved: "cloud", fallbackUsed: false };
    }
    return { provider: deterministicProvider, requested: ask, resolved: "deterministic", fallbackUsed: true };
  }

  // auto
  if (cloudProvider.isConfigured()) {
    return { provider: cloudProvider, requested: ask, resolved: "cloud", fallbackUsed: false };
  }
  if (ollamaProvider.isConfigured()) {
    return { provider: ollamaProvider, requested: ask, resolved: "ollama", fallbackUsed: false };
  }
  return { provider: deterministicProvider, requested: ask, resolved: "deterministic", fallbackUsed: false };
}

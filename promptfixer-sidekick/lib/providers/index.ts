/**
 * Provider router.
 *
 * Routing rules — context-aware in Auto mode:
 *
 *   engine = "deterministic"           → deterministic                        (never call out)
 *   engine = "ollama"                  → ollama → cloud → deterministic       (regardless of context)
 *   engine = "cloud"                   → cloud → deterministic                (regardless of context)
 *   engine = "auto" + web              → cloud → deterministic                (no Ollama on server)
 *   engine = "auto" + mobile           → cloud → deterministic                (iPhone can't run Ollama)
 *   engine = "auto" + desktop          → ollama → cloud → deterministic       (Mac shell prefers local)
 *
 * AI_ENGINE pins the default engine when the request doesn't specify.
 * clientContext defaults to "web".
 *
 * Cloud calls run server-side only; Ollama is opt-in (OLLAMA_BASE_URL must be set).
 * The VPS does NOT host heavy local models.
 */

import type { ClientContext, Engine, RoutingOrder } from "../types";
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

export function isClientContext(value: unknown): value is ClientContext {
  return value === "web" || value === "desktop" || value === "mobile";
}

export interface RouteResult {
  provider: Provider;
  requested: Engine;
  resolved: Engine;
  clientContext: ClientContext;
  fallbackUsed: boolean;
  order: Array<"cloud" | "ollama" | "deterministic">;
}

/**
 * The static preference list for a given (engine, clientContext) pair.
 * Used by /api/health to expose routing intent without actually probing.
 */
export function preferenceList(
  engine: Engine,
  clientContext: ClientContext
): Array<"cloud" | "ollama" | "deterministic"> {
  if (engine === "deterministic") return ["deterministic"];
  if (engine === "ollama") return ["ollama", "cloud", "deterministic"];
  if (engine === "cloud") return ["cloud", "deterministic"];
  // auto — context-aware
  if (clientContext === "desktop") return ["ollama", "cloud", "deterministic"];
  return ["cloud", "deterministic"];
}

export function routingOrder(): RoutingOrder {
  return {
    auto: {
      web: preferenceList("auto", "web"),
      mobile: preferenceList("auto", "mobile"),
      desktop: preferenceList("auto", "desktop")
    } as RoutingOrder["auto"],
    cloud: preferenceList("cloud", "web") as RoutingOrder["cloud"],
    ollama: preferenceList("ollama", "web") as RoutingOrder["ollama"],
    deterministic: preferenceList("deterministic", "web") as RoutingOrder["deterministic"]
  };
}

export function route(requested?: Engine, clientContext: ClientContext = "web"): RouteResult {
  const ask: Engine = isEngine(requested) ? requested : defaultEngine();
  const ctx: ClientContext = isClientContext(clientContext) ? clientContext : "web";
  const order = preferenceList(ask, ctx);

  for (const id of order) {
    if (id === "deterministic") {
      return {
        provider: deterministicProvider,
        requested: ask,
        resolved: "deterministic",
        clientContext: ctx,
        fallbackUsed: order[0] !== "deterministic",
        order
      };
    }
    if (id === "cloud" && cloudProvider.isConfigured()) {
      return {
        provider: cloudProvider,
        requested: ask,
        resolved: "cloud",
        clientContext: ctx,
        fallbackUsed: order[0] !== "cloud",
        order
      };
    }
    if (id === "ollama" && ollamaProvider.isConfigured()) {
      return {
        provider: ollamaProvider,
        requested: ask,
        resolved: "ollama",
        clientContext: ctx,
        fallbackUsed: order[0] !== "ollama",
        order
      };
    }
  }

  // Unreachable: deterministic is always last and always available.
  return {
    provider: deterministicProvider,
    requested: ask,
    resolved: "deterministic",
    clientContext: ctx,
    fallbackUsed: true,
    order
  };
}

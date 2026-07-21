/**
 * Provider router.
 *
 * Routing rules — context-aware in Auto mode, strict in explicit Ollama mode:
 *
 *   engine = "deterministic"           → deterministic                            (never call out)
 *   engine = "ollama"  (strict)        → ollama → deterministic                   (DEFAULT — never cloud)
 *   engine = "ollama"  + allowCloudFallback=true → ollama → cloud → deterministic (opt-in only)
 *   engine = "cloud"                   → cloud → deterministic
 *   engine = "auto" + web              → cloud → deterministic
 *   engine = "auto" + mobile           → cloud → deterministic
 *   engine = "auto" + desktop          → ollama → cloud → deterministic
 *
 * Why strict ollama? Local Ollama is positioned as local / private / unlimited.
 * Silently falling through to a paid cloud API would be a privacy leak and an
 * unexpected cost. The user must explicitly enable `allowCloudFallback`.
 *
 * AI_ENGINE pins the default engine when the request doesn't specify.
 * clientContext defaults to "web".
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

export interface RouteOptions {
  /**
   * Only meaningful when engine === "ollama". When false (default), an
   * unreachable Ollama falls back to the deterministic engine — NOT the
   * cloud provider. When true, falls through ollama → cloud → deterministic.
   */
  allowCloudFallback?: boolean;
}

export interface RouteResult {
  provider: Provider;
  requested: Engine;
  resolved: Engine;
  clientContext: ClientContext;
  allowCloudFallback: boolean;
  fallbackUsed: boolean;
  order: Array<"cloud" | "ollama" | "deterministic">;
}

/**
 * The static preference list for a given (engine, clientContext) pair.
 * Used by /api/health to expose routing intent without actually probing.
 */
export function preferenceList(
  engine: Engine,
  clientContext: ClientContext,
  options: RouteOptions = {}
): Array<"cloud" | "ollama" | "deterministic"> {
  if (engine === "deterministic") return ["deterministic"];

  if (engine === "ollama") {
    // Strict by default. Cloud is added only when the caller opts in.
    return options.allowCloudFallback
      ? ["ollama", "cloud", "deterministic"]
      : ["ollama", "deterministic"];
  }

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
    ollama: {
      strict: preferenceList("ollama", "web", { allowCloudFallback: false }) as RoutingOrder["ollama"]["strict"],
      withCloudFallback: preferenceList("ollama", "web", {
        allowCloudFallback: true
      }) as RoutingOrder["ollama"]["withCloudFallback"]
    },
    deterministic: preferenceList("deterministic", "web") as RoutingOrder["deterministic"]
  };
}

export function route(
  requested?: Engine,
  clientContext: ClientContext = "web",
  options: RouteOptions = {}
): RouteResult {
  const ask: Engine = isEngine(requested) ? requested : defaultEngine();
  const ctx: ClientContext = isClientContext(clientContext) ? clientContext : "web";
  const allowCloudFallback = ask === "ollama" ? Boolean(options.allowCloudFallback) : false;
  const order = preferenceList(ask, ctx, { allowCloudFallback });

  for (const id of order) {
    if (id === "deterministic") {
      return {
        provider: deterministicProvider,
        requested: ask,
        resolved: "deterministic",
        clientContext: ctx,
        allowCloudFallback,
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
        allowCloudFallback,
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
        allowCloudFallback,
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
    allowCloudFallback,
    fallbackUsed: true,
    order
  };
}

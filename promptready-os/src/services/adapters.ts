/**
 * Adapter registry · Sprint B · Operator Intelligence.
 *
 * Single source of truth for every external integration seam in the
 * Intelligence Layer (markets, crypto, fx, commodities, signals, news,
 * earnings, export-ops) plus email and on-chain. NO networking happens
 * here — this is the honest seam the desktop runtime wires real
 * providers into. We NEVER fabricate prices, headlines, or "connected"
 * status.
 *
 * Status model (three honest states):
 *   offline       · key-based provider with no key configured
 *   adapter-ready · seam defined · keyless API or key present · awaiting
 *                   the desktop runtime to make the verified call
 *   connected     · a real round-trip has been verified by the runtime
 *                   (set via window.__OPERATOR_CONFIG__.connectedAdapters)
 *
 * Reads optional config from window.__OPERATOR_CONFIG__ and build-time
 * VITE_* env. Literal `import.meta.env.VITE_*` access is required so
 * Vite statically inlines each value at build time.
 */

export type AdapterStatus = "offline" | "adapter-ready" | "connected";

export type AdapterModule =
  | "markets"
  | "crypto"
  | "fx"
  | "commodities"
  | "signals"
  | "watchlists"
  | "news"
  | "earnings"
  | "export-ops"
  | "ai-news"
  | "email"
  | "onchain";

export interface AdapterDef {
  id: string;
  provider: string;
  label: string;
  module: AdapterModule;
  /** Whether the provider needs an API key (vs. a keyless/public API). */
  keyless: boolean;
  /** The runtime/env key that supplies credentials, if any. */
  envKey?: string;
  note: string;
}

export const ADAPTERS: AdapterDef[] = [
  // markets / equities
  { id: "twelvedata", provider: "TwelveData", label: "Equities · indices · FX", module: "markets", keyless: false, envKey: "VITE_TWELVEDATA_API_KEY", note: "Stocks, indices, FX, quotes." },
  { id: "fmp", provider: "FMP", label: "Fundamentals · earnings", module: "earnings", keyless: false, envKey: "VITE_FMP_API_KEY", note: "Financial Modeling Prep · earnings calendar." },
  // crypto
  { id: "coingecko", provider: "CoinGecko", label: "Crypto prices", module: "crypto", keyless: true, envKey: "VITE_COINGECKO_API_KEY", note: "Public crypto market data." },
  { id: "binance", provider: "Binance", label: "Spot · perps", module: "crypto", keyless: true, envKey: "VITE_BINANCE_API_KEY", note: "Public market endpoints." },
  // fx + commodities (TwelveData covers both)
  { id: "twelvedata-fx", provider: "TwelveData", label: "Currency pairs", module: "fx", keyless: false, envKey: "VITE_TWELVEDATA_API_KEY", note: "FX pairs." },
  { id: "twelvedata-commodities", provider: "TwelveData", label: "Gold · oil · metals", module: "commodities", keyless: false, envKey: "VITE_TWELVEDATA_API_KEY", note: "Commodities quotes." },
  // signals (derived from market providers + on-chain)
  { id: "etherscan", provider: "Etherscan", label: "On-chain flow", module: "onchain", keyless: false, envKey: "VITE_ETHERSCAN_API_KEY", note: "Whale watch · wallet flow." },
  // news
  { id: "newsapi", provider: "NewsAPI", label: "Headlines", module: "news", keyless: false, envKey: "VITE_NEWSAPI_KEY", note: "General + market news." },
  { id: "cryptopanic", provider: "CryptoPanic", label: "Crypto news", module: "news", keyless: true, envKey: "VITE_CRYPTOPANIC_KEY", note: "Crypto-focused news feed." }
];

interface RuntimeConfig {
  connectedAdapters?: string[];
  [k: string]: unknown;
}

function readRuntimeConfig(): RuntimeConfig {
  if (typeof window === "undefined") return {};
  return (
    (window as unknown as { __OPERATOR_CONFIG__?: RuntimeConfig }).__OPERATOR_CONFIG__ ?? {}
  );
}

/**
 * Build-time env keys. Literal access so Vite inlines each value.
 */
function envKeyValue(envKey: string | undefined): string | undefined {
  switch (envKey) {
    case "VITE_TWELVEDATA_API_KEY":
      return import.meta.env.VITE_TWELVEDATA_API_KEY;
    case "VITE_COINGECKO_API_KEY":
      return import.meta.env.VITE_COINGECKO_API_KEY;
    case "VITE_BINANCE_API_KEY":
      return import.meta.env.VITE_BINANCE_API_KEY;
    case "VITE_NEWSAPI_KEY":
      return import.meta.env.VITE_NEWSAPI_KEY;
    case "VITE_CRYPTOPANIC_KEY":
      return import.meta.env.VITE_CRYPTOPANIC_KEY;
    case "VITE_FMP_API_KEY":
      return import.meta.env.VITE_FMP_API_KEY;
    case "VITE_ETHERSCAN_API_KEY":
      return import.meta.env.VITE_ETHERSCAN_API_KEY;
    default:
      return undefined;
  }
}

export function adapterStatus(a: AdapterDef): AdapterStatus {
  const cfg = readRuntimeConfig();
  if (Array.isArray(cfg.connectedAdapters) && cfg.connectedAdapters.includes(a.id)) {
    return "connected";
  }
  // Keyless public APIs have a usable seam already; key-based providers
  // need a key to be "adapter-ready", otherwise they are offline.
  if (a.keyless) return "adapter-ready";
  const hasKey = !!envKeyValue(a.envKey) || !!cfg[a.envKey ?? ""];
  return hasKey ? "adapter-ready" : "offline";
}

export interface ModuleStatus {
  module: AdapterModule;
  status: AdapterStatus;
  providers: string[];
  adapters: Array<{ def: AdapterDef; status: AdapterStatus }>;
}

export function adaptersForModule(module: AdapterModule): AdapterDef[] {
  return ADAPTERS.filter((a) => a.module === module);
}

export function statusForModule(module: AdapterModule): ModuleStatus {
  const defs = adaptersForModule(module);
  const adapters = defs.map((def) => ({ def, status: adapterStatus(def) }));
  let status: AdapterStatus = "offline";
  if (adapters.some((a) => a.status === "connected")) status = "connected";
  else if (adapters.some((a) => a.status === "adapter-ready")) status = "adapter-ready";
  return {
    module,
    status,
    providers: Array.from(new Set(defs.map((d) => d.provider))),
    adapters
  };
}

/** Aggregate counts across the whole registry · for launch readiness. */
export function adapterSummary(): {
  total: number;
  connected: number;
  ready: number;
  offline: number;
} {
  let connected = 0;
  let ready = 0;
  let offline = 0;
  for (const a of ADAPTERS) {
    const s = adapterStatus(a);
    if (s === "connected") connected++;
    else if (s === "adapter-ready") ready++;
    else offline++;
  }
  return { total: ADAPTERS.length, connected, ready, offline };
}

/** Human label + tone for a status pill. */
export function statusMeta(status: AdapterStatus): { label: string; tone: "ok" | "accent" | "muted" } {
  switch (status) {
    case "connected":
      return { label: "connected", tone: "ok" };
    case "adapter-ready":
      return { label: "adapter ready", tone: "accent" };
    default:
      return { label: "offline", tone: "muted" };
  }
}

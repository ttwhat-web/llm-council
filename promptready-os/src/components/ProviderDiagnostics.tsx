"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Activity, Loader2 } from "lucide-react";
import {
  ADAPTERS,
  adapterStatus,
  type AdapterStatus
} from "@/services/adapters";
import { getHealth } from "@/services/providerHealth";
import { probeOllama } from "@/services/missionRunner";
import { getTelegramBridgeStatus } from "@/services/telegramLive";
import { runtimeLocation, refreshEnvStatus, envConfiguredCached } from "@/services/runtimeBridge";

/**
 * Provider Diagnostics · Sprint C.
 *
 * One honest table of every external provider: live status, last
 * success / last error (from real call outcomes), whether a key is
 * needed, browser CORS risk, and where the call can actually run
 * (browser / tauri / server). Status is never fabricated — keyless
 * public providers only read "connected" after a verified fetch.
 */

type Runtime = "browser" | "tauri" | "server";

interface ProviderFact {
  id: string; // adapter id when registry-backed, else synthetic
  provider: string;
  /** registry adapter id to read live status/health from, if any. */
  adapterId?: string;
  needsKey: boolean;
  cors: "none" | "low" | "yes";
  runtime: Runtime[];
}

// Static, honest integration facts. Live status overlays on top.
const FACTS: ProviderFact[] = [
  { id: "ollama", provider: "Ollama", needsKey: false, cors: "none", runtime: ["browser", "tauri"] },
  { id: "telegram", provider: "Telegram", needsKey: true, cors: "yes", runtime: ["tauri", "server"] },
  { id: "coingecko", provider: "CoinGecko", adapterId: "coingecko", needsKey: false, cors: "none", runtime: ["browser", "tauri"] },
  { id: "hackernews", provider: "Hacker News (News)", adapterId: "hackernews", needsKey: false, cors: "none", runtime: ["browser", "tauri"] },
  { id: "binance", provider: "Binance", adapterId: "binance", needsKey: false, cors: "low", runtime: ["browser", "tauri"] },
  { id: "twelvedata", provider: "TwelveData", adapterId: "twelvedata", needsKey: true, cors: "low", runtime: ["browser", "tauri"] },
  { id: "fmp", provider: "FMP", adapterId: "fmp", needsKey: true, cors: "low", runtime: ["browser", "tauri"] },
  { id: "etherscan", provider: "Etherscan", adapterId: "etherscan", needsKey: true, cors: "low", runtime: ["browser", "tauri"] },
  { id: "newsapi", provider: "NewsAPI", adapterId: "newsapi", needsKey: true, cors: "yes", runtime: ["tauri", "server"] },
  { id: "cryptopanic", provider: "CryptoPanic", adapterId: "cryptopanic", needsKey: false, cors: "yes", runtime: ["tauri", "server"] },
  { id: "gmail", provider: "Gmail", needsKey: true, cors: "yes", runtime: ["server", "tauri"] },
  { id: "imap", provider: "IMAP", needsKey: true, cors: "yes", runtime: ["server", "tauri"] },
  { id: "outlook", provider: "Outlook", needsKey: true, cors: "yes", runtime: ["server", "tauri"] }
];

const STATUS_PILL: Record<AdapterStatus, string> = {
  connected: "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200",
  "adapter-ready": "border-accent/30 bg-accent/[0.08] text-accent",
  error: "border-rose-400/30 bg-rose-500/[0.08] text-rose-200",
  offline: "border-white/10 bg-white/[0.03] text-white/55"
};

// env var per provider · used to show desktop-configured keys honestly
const ENV_KEY: Record<string, string> = {
  telegram: "TELEGRAM_BOT_TOKEN",
  twelvedata: "TWELVEDATA_API_KEY",
  fmp: "FMP_API_KEY",
  newsapi: "NEWSAPI_KEY",
  cryptopanic: "CRYPTOPANIC_API_KEY",
  etherscan: "ETHERSCAN_API_KEY"
};

export function ProviderDiagnostics() {
  const [ollamaUp, setOllamaUp] = useState<boolean | null>(null);
  const [, setEnvTick] = useState(0);
  const location = runtimeLocation();

  useEffect(() => {
    let alive = true;
    probeOllama()
      .then((p) => alive && setOllamaUp(p.reachable))
      .catch(() => alive && setOllamaUp(false));
    void refreshEnvStatus().then(() => alive && setEnvTick((n) => n + 1));
    return () => {
      alive = false;
    };
  }, []);

  const tg = getTelegramBridgeStatus();

  const rows = FACTS.map((f) => {
    let status: AdapterStatus;
    let lastSuccess: number | null = null;
    let lastError: string | null = null;

    if (f.id === "ollama") {
      status = ollamaUp == null ? "offline" : ollamaUp ? "connected" : "offline";
    } else if (f.id === "telegram") {
      status =
        tg.live === "live-connected"
          ? "connected"
          : tg.live === "error"
            ? "error"
            : tg.live === "live-ready"
              ? "adapter-ready"
              : "offline";
      lastSuccess = tg.lastSendAt;
      lastError = tg.lastError;
    } else if (f.adapterId) {
      const def = ADAPTERS.find((a) => a.id === f.adapterId);
      status = def ? adapterStatus(def) : "offline";
      const h = getHealth(f.adapterId);
      lastSuccess = h.lastSuccess;
      lastError = h.lastErrorMsg;
    } else {
      // email providers · no live adapter yet
      status = "offline";
    }

    return { fact: f, status, lastSuccess, lastError };
  });

  const connected = rows.filter((r) => r.status === "connected").length;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Provider Diagnostics</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={clsx(
              "rounded border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider",
              location === "tauri"
                ? "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200"
                : "border-white/10 bg-white/[0.03] text-white/55"
            )}
          >
            runtime · {location}
          </span>
          <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/55">
            {connected} connected · {rows.length} providers
          </span>
        </div>
      </header>

      <p className="text-[11px] text-white/55">
        Live status from real call outcomes. Keyless public providers only read
        "connected" after a verified fetch. CORS-risk providers need the Tauri
        runtime or a server proxy — the browser preview can't reach them.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-white/40">
              <Th>provider</Th>
              <Th>status</Th>
              <Th>last success</Th>
              <Th>last error</Th>
              <Th>key</Th>
              <Th>cors</Th>
              <Th>runtime</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ fact, status, lastSuccess, lastError }) => (
              <tr key={fact.id} className="border-t border-white/6 align-top">
                <td className="py-1.5 pr-2 text-[11.5px] font-semibold text-white">
                  {fact.provider}
                </td>
                <td className="py-1.5 pr-2">
                  <span
                    className={clsx(
                      "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                      STATUS_PILL[status]
                    )}
                  >
                    {fact.id === "ollama" && ollamaUp == null && (
                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    )}
                    {status === "adapter-ready" ? "needs setup" : status}
                  </span>
                </td>
                <td className="py-1.5 pr-2 font-mono text-[10px] text-white/55">
                  {lastSuccess ? new Date(lastSuccess).toLocaleTimeString() : "—"}
                </td>
                <td className="max-w-[180px] py-1.5 pr-2 font-mono text-[10px] text-rose-200/70">
                  <span className="block truncate" title={lastError ?? undefined}>
                    {lastError ?? "—"}
                  </span>
                </td>
                <td className="py-1.5 pr-2 font-mono text-[10px] text-white/55">
                  {fact.needsKey ? "yes" : "no"}
                  {ENV_KEY[fact.id] && envConfiguredCached(ENV_KEY[fact.id]) && (
                    <span className="ml-1 text-emerald-300/80">· set</span>
                  )}
                </td>
                <td className="py-1.5 pr-2 font-mono text-[10px]">
                  <span
                    className={clsx(
                      fact.cors === "yes"
                        ? "text-rose-200/80"
                        : fact.cors === "low"
                          ? "text-amber-200/80"
                          : "text-emerald-200/80"
                    )}
                  >
                    {fact.cors}
                  </span>
                </td>
                <td className="py-1.5 font-mono text-[10px] text-white/55">
                  {fact.runtime.join(" / ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="py-1 pr-2 font-normal">{children}</th>;
}

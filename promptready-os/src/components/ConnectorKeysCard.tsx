"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { KeyRound } from "lucide-react";
import { isTauri, runtimeLocation, refreshEnvStatus } from "@/services/runtimeBridge";

/**
 * Connector Keys · read-only view of connector env vars.
 *
 * Honest by construction: secret values are never fetched or shown — Rust
 * reads them from the process environment and returns only a `configured`
 * boolean per key. There are no input fields. In the browser preview no env
 * is available, so every key reads "browser preview · n/a", not "missing".
 */

const PILL_EMERALD = "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200";
const PILL_MUTED = "border-white/10 bg-white/[0.03] text-white/55";

interface KeyRow {
  provider: string;
  envVar: string;
  whereUsed: string;
  runtime: string;
}

const KEYS: KeyRow[] = [
  { provider: "Telegram bot", envVar: "TELEGRAM_BOT_TOKEN", whereUsed: "Telegram send/poll", runtime: "tauri" },
  { provider: "Telegram chat", envVar: "TELEGRAM_ALLOWED_CHAT_ID", whereUsed: "allowed chat filter", runtime: "tauri" },
  { provider: "TwelveData", envVar: "TWELVEDATA_API_KEY", whereUsed: "Markets · stocks/FX/commodities", runtime: "tauri" },
  { provider: "FMP", envVar: "FMP_API_KEY", whereUsed: "Earnings", runtime: "tauri" },
  { provider: "NewsAPI", envVar: "NEWSAPI_KEY", whereUsed: "News Wire (fallback HN)", runtime: "tauri" },
  { provider: "CryptoPanic", envVar: "CRYPTOPANIC_API_KEY", whereUsed: "Crypto news", runtime: "tauri" },
  { provider: "Etherscan", envVar: "ETHERSCAN_API_KEY", whereUsed: "On-chain / gas", runtime: "tauri" }
];

export function ConnectorKeysCard() {
  const [env, setEnv] = useState<Record<string, boolean>>({});
  const tauri = isTauri();

  useEffect(() => {
    let alive = true;
    refreshEnvStatus()
      .then((next) => alive && setEnv(next))
      .catch(() => alive && setEnv({}));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Connector Keys</span>
        </div>
        <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/55">
          {runtimeLocation() === "tauri" ? "tauri" : "browser preview"}
        </span>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-white/40">
              <Th>provider</Th>
              <Th>env var</Th>
              <Th>configured</Th>
              <Th>where used</Th>
              <Th>runtime</Th>
            </tr>
          </thead>
          <tbody>
            {KEYS.map((row) => {
              const configured = tauri ? env[row.envVar] === true : false;
              return (
                <tr key={row.envVar} className="border-t border-white/6 align-top">
                  <td className="py-1.5 pr-2 text-[11.5px] font-semibold text-white">
                    {row.provider}
                  </td>
                  <td className="py-1.5 pr-2 font-mono text-[10px] text-white/55">
                    {row.envVar}
                  </td>
                  <td className="py-1.5 pr-2">
                    {tauri ? (
                      <span
                        className={clsx(
                          "inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                          configured ? PILL_EMERALD : PILL_MUTED
                        )}
                      >
                        {configured ? "yes" : "no"}
                      </span>
                    ) : (
                      <span
                        className={clsx(
                          "inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                          PILL_MUTED
                        )}
                      >
                        n/a (preview)
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 pr-2 text-[11px] text-white/55">{row.whereUsed}</td>
                  <td className="py-1.5 font-mono text-[10px] text-white/55">
                    {tauri ? row.runtime : "browser preview · n/a"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-white/55">
        Set these env vars before starting Operator Core. GUI launches from Finder
        do not inherit a shell's env — launch the app from a terminal, or use a
        launchd plist. A secure keychain store is planned; until then values are
        read from the process environment in Rust and never returned to the UI
        (only configured yes/no).
      </p>
    </section>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="py-1 pr-2 font-normal">{children}</th>;
}

"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { AlertTriangle, Cloud, Cpu, Info, RefreshCw, Settings2 } from "lucide-react";
import type {
  ClientContext,
  Engine,
  HealthResponse,
  SupervisorReview,
  UsageSnapshot
} from "@/lib/types";

interface Props {
  selectedEngine: Engine;
  clientContext: ClientContext;
  allowCloudFallback: boolean;
  lastSupervisor?: SupervisorReview;
  lastUsage?: UsageSnapshot;
  compact?: boolean;
}

export function EngineStatus({
  selectedEngine,
  clientContext,
  allowCloudFallback,
  lastSupervisor,
  lastUsage,
  compact
}: Props) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as HealthResponse;
      setHealth(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div className={clsx("rounded-2xl border border-white/8 bg-white/[0.03]", compact ? "p-3" : "p-4")}>
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-medium uppercase tracking-wider text-white/45">
          Engine status
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="no-drag inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-white/55 transition hover:bg-white/5 hover:text-white/80 disabled:opacity-40"
        >
          <RefreshCw className={clsx("h-3 w-3", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] text-red-200">
          {error}
        </div>
      )}

      {selectedEngine === "ollama" && health && !ollamaUsable(health) && (
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-200">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <div className="font-medium">Ollama unavailable</div>
            <div className="opacity-80">
              {allowCloudFallback
                ? "Cloud fallback is on — calls will go to the cloud and count toward your daily quota."
                : "Using Rules Only fallback. Cloud is NOT called and usage is NOT metered."}
            </div>
          </div>
        </div>
      )}

      {selectedEngine === "ollama" && allowCloudFallback && (
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1.5 text-[11px] text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <span className="font-medium">Cloud fallback enabled.</span> If Ollama is
            unreachable, requests will be sent to the cloud provider — usage may count
            toward your daily quota and your input will leave your machine.
          </span>
        </div>
      )}

      <div className="mt-3 space-y-2 text-[12px]">
        <Row
          icon={<Cloud className="h-3.5 w-3.5" />}
          label="Cloud AI"
          status={
            health?.cloud.configured
              ? health.cloud.reachable
                ? `configured · ${health.cloud.vendor ?? ""} ${health.cloud.model ?? ""}`.trim()
                : `configured · unreachable (${health.cloud.error || "?"})`
              : "not configured"
          }
          tone={
            health?.cloud.configured && health.cloud.reachable
              ? "ok"
              : health?.cloud.configured
                ? "warn"
                : "muted"
          }
        />
        <Row
          icon={<Cpu className="h-3.5 w-3.5" />}
          label="Ollama (local)"
          status={
            health?.ollama.configured
              ? health.ollama.reachable
                ? "connected"
                : `not connected (${health.ollama.error || "?"})`
              : "not configured"
          }
          tone={
            health?.ollama.configured && health.ollama.reachable
              ? "ok"
              : health?.ollama.configured
                ? "warn"
                : "muted"
          }
        />
        {health?.ollama.profiles && (
          <OllamaProfiles
            profiles={health.ollama.profiles}
            installed={health.ollama.models}
            reachable={health.ollama.reachable}
          />
        )}
        <Row
          icon={<Settings2 className="h-3.5 w-3.5" />}
          label="Rules engine"
          status="always available"
          tone="ok"
        />
      </div>

      <div className="mt-3 border-t border-white/5 pt-3 text-[11px] text-white/65">
        <div>
          <span className="text-white/45">Selected: </span>
          <span className="text-white/85">{selectedEngine}</span>
          <span className="text-white/45"> · context: </span>
          <span className="text-white/85">{clientContext}</span>
          {health && (
            <>
              <span className="text-white/45"> · default: </span>
              <span className="text-white/85">{health.defaultEngine}</span>
            </>
          )}
        </div>
        {health && (
          <div className="mt-1">
            <span className="text-white/45">Routing ({selectedEngine}): </span>
            <span className="font-mono text-white/85">
              {routingFor(health, selectedEngine, clientContext, allowCloudFallback).join(" → ")}
            </span>
          </div>
        )}
        {lastSupervisor && (
          <div className="mt-1">
            <span className="text-white/45">Last call: </span>
            <span className="text-white/85">
              {lastSupervisor.resolved}
              {lastSupervisor.model ? ` · ${lastSupervisor.model}` : ""}
              {typeof lastSupervisor.latencyMs === "number"
                ? ` · ${lastSupervisor.latencyMs}ms`
                : ""}
            </span>
            {lastSupervisor.fallbackUsed && (
              <span className="ml-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-200">
                fallback
              </span>
            )}
          </div>
        )}
        {lastUsage && (
          <div className="mt-1">
            <span className="text-white/45">Daily quota ({lastUsage.tier}): </span>
            <span className="text-white/85">
              {lastUsage.used}/{lastUsage.limit}
            </span>
            <span className="text-white/45"> · resets {formatReset(lastUsage.resetAt)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  status,
  tone
}: {
  icon: React.ReactNode;
  label: string;
  status: string;
  tone: "ok" | "warn" | "muted";
}) {
  const dot =
    tone === "ok"
      ? "bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.5)]"
      : tone === "warn"
        ? "bg-amber-400 shadow-[0_0_6px_2px_rgba(251,191,36,0.4)]"
        : "bg-white/25";
  return (
    <div className="flex items-center gap-2">
      <span className={clsx("h-1.5 w-1.5 rounded-full", dot)} />
      <span className="text-white/65">{icon}</span>
      <span className="text-white/75">{label}</span>
      <span className="text-white/45">·</span>
      <span className="truncate text-white/65">{status}</span>
    </div>
  );
}

function formatReset(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function routingFor(
  health: HealthResponse,
  engine: Engine,
  ctx: ClientContext,
  allowCloudFallback: boolean
): readonly string[] {
  if (engine === "auto") return health.routing.auto[ctx];
  if (engine === "cloud") return health.routing.cloud;
  if (engine === "ollama") {
    return allowCloudFallback
      ? health.routing.ollama.withCloudFallback
      : health.routing.ollama.strict;
  }
  return health.routing.deterministic;
}

function ollamaUsable(health: HealthResponse): boolean {
  return Boolean(health.ollama.configured && health.ollama.reachable);
}

interface ProfileMap {
  fast: string;
  smart: string;
  coder: string;
  agent: string;
}

const PROFILE_LABELS: Array<{
  key: keyof ProfileMap;
  label: string;
  hint: string;
}> = [
  { key: "fast", label: "Fast", hint: "low-resource fallback" },
  { key: "smart", label: "Smart", hint: "default supervisor" },
  { key: "coder", label: "Code", hint: "code / terminal / AS400" },
  { key: "agent", label: "Agent", hint: "experimental" }
];

function OllamaProfiles({
  profiles,
  installed,
  reachable
}: {
  profiles: ProfileMap;
  installed?: string[];
  reachable: boolean;
}) {
  const installedSet = new Set(
    (installed ?? []).map((m) => m.toLowerCase().split(":")[0])
  );
  return (
    <div className="ml-5 mt-1 grid grid-cols-2 gap-1.5">
      {PROFILE_LABELS.map(({ key, label, hint }) => {
        const id = profiles[key];
        const isInstalled =
          reachable && installedSet.has(id.toLowerCase().split(":")[0]);
        return (
          <div
            key={key}
            className={clsx(
              "flex flex-col rounded-lg border px-2 py-1 text-[10px] leading-tight",
              isInstalled
                ? "border-emerald-500/25 bg-emerald-500/5"
                : "border-white/8 bg-white/[0.02]"
            )}
            title={hint}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-white/85">{label}</span>
              {!isInstalled && reachable && (
                <span className="text-[9px] uppercase tracking-wider text-white/35">
                  not installed
                </span>
              )}
            </div>
            <span className="truncate font-mono text-white/55">{id}</span>
          </div>
        );
      })}
    </div>
  );
}

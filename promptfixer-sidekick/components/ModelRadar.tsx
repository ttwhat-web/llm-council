"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Cloud, Cpu, RefreshCw } from "lucide-react";
import type {
  ClientContext,
  Engine,
  HealthResponse,
  Mode,
  ModelQuality,
  SupervisorReview,
  UsageSnapshot
} from "@/lib/types";

/**
 * Top-right Mission Control HUD. Compact, dense, glanceable.
 *
 * Shows:
 *  - Active provider + resolved model + latency (when available)
 *  - Cloud / Ollama reachability lights
 *  - The four Ollama profiles with installed-state rings
 *  - Routing chain for the current selection
 *  - Quality · Mode · Context footer
 *
 * Uses /api/health on mount (and Refresh) for connectivity, and the most
 * recent supervisor review for the live "Active" line.
 */

interface Props {
  selectedEngine: Engine;
  selectedQuality: ModelQuality;
  selectedMode: Mode;
  clientContext: ClientContext;
  allowCloudFallback: boolean;
  lastSupervisor?: SupervisorReview;
  lastUsage?: UsageSnapshot;
  busy?: boolean;
  /** Most recent supervisor latencies for the live sparkline (newest last). */
  latencyHistory?: number[];
  className?: string;
}

export function ModelRadar({
  selectedEngine,
  selectedQuality,
  selectedMode,
  clientContext,
  allowCloudFallback,
  lastSupervisor,
  lastUsage,
  busy,
  latencyHistory,
  className
}: Props) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      if (res.ok) setHealth((await res.json()) as HealthResponse);
    } catch {
      /* ignore — keep last snapshot */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const cloudReady = Boolean(health?.cloud.configured && health.cloud.reachable);
  const ollamaReady = Boolean(health?.ollama.configured && health.ollama.reachable);
  const ollamaConfigured = Boolean(health?.ollama.configured);

  const activeLabel = busy ? "RUNNING" : lastSupervisor ? "ACTIVE" : "READY";
  const activeProvider = lastSupervisor?.resolved ?? activeProviderFallback(health);
  const activeModel = lastSupervisor?.model ?? activeModelFallback(health);
  const latency = lastSupervisor?.latencyMs;

  const routing = health
    ? routingFor(health, selectedEngine, clientContext, allowCloudFallback)
    : [];

  return (
    <div
      className={clsx(
        "glass-strong relative w-[290px] rounded-2xl border border-white/8 p-3.5 shadow-glass",
        className
      )}
    >
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className={clsx(
              "relative inline-block h-1.5 w-1.5 rounded-full",
              busy
                ? "bg-accent shadow-[0_0_8px_2px_rgba(124,155,255,0.55)]"
                : lastSupervisor
                  ? "bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.55)]"
                  : "bg-white/35"
            )}
          >
            {busy && (
              <span className="absolute inset-0 animate-ping rounded-full bg-accent/40" />
            )}
            {!busy && lastSupervisor && (
              <span className="absolute inset-0 animate-[pulse_2s_ease-in-out_infinite] rounded-full bg-emerald-400/30" />
            )}
          </span>
          <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-white/55">
            {activeLabel}
          </span>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="rounded-md p-0.5 text-white/40 transition hover:bg-white/5 hover:text-white/70 disabled:opacity-40"
          title="Refresh status"
        >
          <RefreshCw className={clsx("h-3 w-3", loading && "animate-spin")} />
        </button>
      </div>

      <div className="mt-1.5 flex flex-col gap-0.5">
        <div className="text-[12px] font-semibold tracking-tight text-white">
          {activeProvider || "no provider"}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="truncate font-mono text-[10px] text-white/55">
            {activeModel || "—"}
          </div>
          {typeof latency === "number" && (
            <div className="font-mono text-[10px] text-white/45">{latency}ms</div>
          )}
        </div>
        {latencyHistory && latencyHistory.length > 1 && (
          <Sparkline values={latencyHistory} />
        )}
      </div>

      {/* status grid */}
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        <StatusPill
          icon={<Cloud className="h-3 w-3" />}
          label="Cloud"
          state={cloudReady ? "ok" : health?.cloud.configured ? "warn" : "off"}
          detail={health?.cloud.vendor ?? (cloudReady ? "ready" : "off")}
        />
        <StatusPill
          icon={<Cpu className="h-3 w-3" />}
          label="Ollama"
          state={ollamaReady ? "ok" : ollamaConfigured ? "warn" : "off"}
          detail={
            ollamaReady ? "ready" : ollamaConfigured ? "unreachable" : "off"
          }
        />
      </div>

      {/* profiles — only when ollama configured */}
      {ollamaConfigured && health?.ollama.profiles && (
        <div className="mt-3 border-t border-white/5 pt-2.5">
          <div className="mb-1.5 text-[9px] font-medium uppercase tracking-[0.18em] text-white/40">
            Profiles
          </div>
          <div className="grid grid-cols-2 gap-1">
            <ProfilePill
              label="FAST"
              model={health.ollama.profiles.fast}
              installed={isInstalled(health.ollama.profiles.fast, health.ollama.models)}
              active={ollamaReady && selectedQuality === "fast"}
            />
            <ProfilePill
              label="SMART"
              model={health.ollama.profiles.smart}
              installed={isInstalled(health.ollama.profiles.smart, health.ollama.models)}
              active={
                ollamaReady &&
                (selectedQuality === "smart" ||
                  selectedQuality === "expert" ||
                  selectedQuality === "local")
              }
            />
            <ProfilePill
              label="CODER"
              model={health.ollama.profiles.coder}
              installed={isInstalled(health.ollama.profiles.coder, health.ollama.models)}
              active={ollamaReady && selectedQuality === "code"}
            />
            <ProfilePill
              label="AGENT"
              model={health.ollama.profiles.agent}
              installed={isInstalled(health.ollama.profiles.agent, health.ollama.models)}
              active={false}
            />
          </div>
        </div>
      )}

      {/* routing chain (animated when running or fallback) */}
      <div className="mt-3 border-t border-white/5 pt-2.5">
        <div className="mb-1 text-[9px] font-medium uppercase tracking-[0.18em] text-white/40">
          Routing
        </div>
        <RoutingChain providers={routing} active={busy} fallback={lastSupervisor?.fallbackUsed} />
        {lastSupervisor?.fallbackUsed && (
          <div className="mt-1 inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-amber-200">
            fallback {lastSupervisor.requestedEngine} → {lastSupervisor.resolved}
          </div>
        )}
      </div>

      {/* quota — ring */}
      {lastUsage && (
        <div className="mt-3 flex items-center gap-3 border-t border-white/5 pt-2.5">
          <QuotaRing used={lastUsage.used} limit={lastUsage.limit} />
          <div className="flex flex-col leading-tight">
            <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-white/40">
              Quota · {lastUsage.tier}
            </span>
            <span className="font-mono text-[11px] text-white/85">
              {lastUsage.used}
              <span className="text-white/40">/{lastUsage.limit}</span>
            </span>
            <span className="text-[9px] text-white/40">
              resets {formatReset(lastUsage.resetAt)}
            </span>
          </div>
        </div>
      )}

      {/* Ollama setup helper — only when configured but unreachable, OR when
          quality=local but Ollama isn't reachable. Inline, copy-paste ready. */}
      {selectedQuality === "local" && !ollamaReady && (
        <OllamaSetupHelper configured={ollamaConfigured} />
      )}

      {/* footer chips */}
      <div className="mt-3 flex items-center gap-1 border-t border-white/5 pt-2.5">
        <FooterChip label="quality" value={selectedQuality} />
        <FooterChip label="mode" value={selectedMode} />
        <FooterChip label="ctx" value={clientContext} />
      </div>
    </div>
  );
}

// ---------- bits ----------

function StatusPill({
  icon,
  label,
  state,
  detail
}: {
  icon: React.ReactNode;
  label: string;
  state: "ok" | "warn" | "off";
  detail: string;
}) {
  const tone = {
    ok: "border-emerald-500/25 bg-emerald-500/5 text-emerald-200",
    warn: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    off: "border-white/8 bg-white/[0.02] text-white/40"
  }[state];
  const dot = {
    ok: "bg-emerald-400 shadow-[0_0_4px_1px_rgba(52,211,153,0.5)]",
    warn: "bg-amber-400 shadow-[0_0_4px_1px_rgba(251,191,36,0.45)]",
    off: "bg-white/20"
  }[state];
  return (
    <div className={clsx("flex items-center gap-1.5 rounded-lg border px-2 py-1.5", tone)}>
      <span className={clsx("h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
      {icon}
      <div className="flex flex-1 flex-col leading-tight">
        <span className="text-[9px] uppercase tracking-wider text-white/55">{label}</span>
        <span className="truncate text-[10px]">{detail}</span>
      </div>
    </div>
  );
}

function ProfilePill({
  label,
  model,
  installed,
  active
}: {
  label: string;
  model: string;
  installed: boolean;
  active: boolean;
}) {
  return (
    <div
      className={clsx(
        "flex flex-col rounded-md border px-1.5 py-1 leading-tight transition",
        active
          ? "border-accent/40 bg-accent/[0.08]"
          : installed
            ? "border-emerald-500/20 bg-emerald-500/[0.04]"
            : "border-white/8 bg-white/[0.02]"
      )}
      title={`${model}${installed ? " · installed" : " · not installed"}`}
    >
      <div className="flex items-center justify-between">
        <span
          className={clsx(
            "text-[9px] font-medium tracking-wider",
            active ? "text-accent" : installed ? "text-emerald-200" : "text-white/45"
          )}
        >
          {label}
        </span>
        <span
          className={clsx(
            "h-1 w-1 rounded-full",
            active
              ? "bg-accent shadow-[0_0_4px_1px_rgba(124,155,255,0.5)]"
              : installed
                ? "bg-emerald-400/80"
                : "bg-white/20"
          )}
        />
      </div>
      <div className="truncate font-mono text-[9px] text-white/50">{model}</div>
    </div>
  );
}

function FooterChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-white/[0.04] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/55">
      <span className="text-white/35">{label}</span>
      <span className="text-white/85">{value}</span>
    </span>
  );
}

// ---------- helpers ----------

function activeProviderFallback(health: HealthResponse | null): string {
  if (!health) return "";
  if (health.cloud.configured && health.cloud.reachable) {
    return health.cloud.vendor === "anthropic" ? "cloud-anthropic" : "cloud-openai";
  }
  if (health.ollama.configured && health.ollama.reachable) return "ollama";
  return "deterministic";
}

function activeModelFallback(health: HealthResponse | null): string {
  if (!health) return "";
  if (health.cloud.configured && health.cloud.reachable) return health.cloud.model || "";
  if (health.ollama.configured && health.ollama.reachable)
    return health.ollama.model || "";
  return "rules-only";
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

function isInstalled(model: string, installed?: string[]): boolean {
  if (!installed?.length) return false;
  const family = model.toLowerCase().split(":")[0];
  return installed.some((m) => m.toLowerCase().split(":")[0] === family);
}

function formatReset(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

// ---------- visual sub-components ----------

function RoutingChain({
  providers,
  active,
  fallback
}: {
  providers: readonly string[];
  active?: boolean;
  fallback?: boolean;
}) {
  if (providers.length === 0) {
    return <div className="font-mono text-[10px] text-white/55">—</div>;
  }
  return (
    <div className="flex items-center gap-1 overflow-hidden">
      {providers.map((p, i) => {
        const isLast = i === providers.length - 1;
        const tone = fallback && i === 0 ? "warn" : i === 0 ? "ok" : "muted";
        const dot = {
          ok: "bg-emerald-400 shadow-[0_0_4px_1px_rgba(52,211,153,0.45)]",
          warn: "bg-amber-400 shadow-[0_0_4px_1px_rgba(251,191,36,0.45)]",
          muted: "bg-white/30"
        }[tone];
        return (
          <div key={`${p}-${i}`} className="flex items-center gap-1">
            <span className={clsx("h-1 w-1 shrink-0 rounded-full", dot)} />
            <span className="font-mono text-[10px] text-white/75">{p}</span>
            {!isLast && (
              <span className="relative inline-block h-px w-3 overflow-hidden bg-white/10">
                {active && (
                  <span className="absolute inset-y-0 left-0 w-1.5 animate-[shimmer_1.4s_linear_infinite] bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
                )}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function QuotaRing({ used, limit }: { used: number; limit: number }) {
  const pct = Math.max(0, Math.min(1, used / Math.max(1, limit)));
  const r = 14;
  const c = 2 * Math.PI * r;
  const dash = c * pct;
  const tone = pct >= 1 ? "stroke-red-400/85" : pct >= 0.7 ? "stroke-amber-400/85" : "stroke-emerald-400/85";
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" className="shrink-0">
      <circle
        cx="18"
        cy="18"
        r={r}
        className="stroke-white/10"
        strokeWidth="3"
        fill="none"
      />
      <circle
        cx="18"
        cy="18"
        r={r}
        className={clsx(tone, "transition-[stroke-dasharray]")}
        strokeWidth="3"
        strokeDasharray={`${dash} ${c}`}
        strokeLinecap="round"
        fill="none"
        transform="rotate(-90 18 18)"
      />
    </svg>
  );
}

function Sparkline({ values }: { values: number[] }) {
  // Last 8 values, normalised. Two-decimal SVG path.
  const pts = values.slice(-8);
  const max = Math.max(...pts, 1);
  const min = Math.min(...pts, 0);
  const range = Math.max(1, max - min);
  const w = 100;
  const h = 14;
  const step = pts.length > 1 ? w / (pts.length - 1) : w;
  const path = pts
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * (h - 2) - 1;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="mt-1 w-full overflow-visible" viewBox={`0 0 ${w} ${h}`}>
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1" className="text-accent/70" />
      {pts.length > 0 && (
        <circle
          cx={(pts.length - 1) * step}
          cy={h - ((pts[pts.length - 1] - min) / range) * (h - 2) - 1}
          r="1.4"
          className="fill-accent"
        />
      )}
    </svg>
  );
}

function OllamaSetupHelper({ configured }: { configured: boolean }) {
  const lines = [
    "brew install ollama",
    "ollama serve",
    "ollama pull gemma4",
    "ollama pull qwen2.5-coder:7b",
    "ollama pull hermes3",
    "",
    "# in your .env.local:",
    "OLLAMA_BASE_URL=http://127.0.0.1:11434"
  ].join("\n");
  return (
    <div className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-2.5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-amber-200/85">
          Local AI · {configured ? "unreachable" : "not configured"}
        </span>
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(lines)}
          className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/55 transition hover:bg-white/[0.06] hover:text-white/80"
        >
          Copy
        </button>
      </div>
      <pre className="scrollbar-thin overflow-auto whitespace-pre-wrap font-mono text-[10px] leading-5 text-amber-100/85">
        {lines}
      </pre>
    </div>
  );
}

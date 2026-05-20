"use client";

import { useMemo } from "react";
import clsx from "clsx";
import { Coins } from "lucide-react";
import { useMissionStore } from "@/store/mission";
import { computeCostBoard, formatUsd, PRICING } from "@/services/cost";

/**
 * Model Costs · honest cost board.
 *
 * Real cloud spend is $0 today — no cloud missions have run. Every
 * number here is sourced from local mission history via the cost
 * service. Cloud figures are *avoided* costs (what a mid-tier cloud
 * model would have charged), never claimed real spend. With no
 * history we lead with "needs data" rather than zeros everywhere.
 */

type Tone = "ok" | "warn" | "muted" | "accent";

const PILL_TONE: Record<Tone, string> = {
  ok: "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200",
  warn: "border-amber-400/30 bg-amber-500/[0.08] text-amber-200",
  muted: "border-white/10 bg-white/[0.03] text-white/55",
  accent: "border-accent/30 bg-accent/[0.08] text-accent"
};

export function ModelCostsCard() {
  const history = useMissionStore((s) => s.history);
  const board = useMemo(() => computeCostBoard(history), [history]);

  const empty = history.length === 0;
  const usedMissions = board.localMissions + board.ollamaMissions;
  const avgMissionCost = formatUsd(board.estimatedCloudCostAvoidedUSD / Math.max(1, usedMissions));
  const cloudAvoided = formatUsd(board.estimatedCloudCostAvoidedUSD);

  const monthlyEstimate = empty
    ? "needs data"
    : `based on ${usedMissions} missions · ${cloudAvoided} cloud avoided`;

  const rows: Row[] = [
    { name: "Claude", tokens: "—", cost: "$0", note: "BYOK · not used", muted: true },
    { name: "OpenAI", tokens: "—", cost: "$0", note: "BYOK · not used", muted: true },
    {
      name: "Ollama",
      tokens: board.totalOllamaTokens > 0 ? board.totalOllamaTokens.toLocaleString() : "—",
      cost: "$0 (local)",
      note: board.totalOllamaLatencyMs ? `${board.totalOllamaLatencyMs}ms total` : "—",
      sub: `${board.ollamaMissions} missions`
    },
    {
      name: "Local (deterministic)",
      tokens: "—",
      cost: "$0",
      note: "always free",
      sub: `${board.localMissions} missions`
    }
  ];

  const suggestions: string[] = [];
  if (empty) suggestions.push("Run a mission to populate the cost board");
  if (board.ollamaMissions === 0) suggestions.push("Try Ollama to keep heavy work local");
  if (usedMissions > 0) suggestions.push(`You've kept ${cloudAvoided} of cloud spend local`);

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Model Costs</span>
        </div>
        <span
          className={clsx(
            "rounded border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider",
            empty ? PILL_TONE.muted : PILL_TONE.ok
          )}
        >
          {empty ? "needs data" : "local · $0 cloud"}
        </span>
      </header>

      <p className="text-[11px] text-white/55">
        {empty
          ? "needs data · no missions yet. Run a mission and this board fills from local history — never invented numbers."
          : "Real cloud spend is $0. Cloud figures below are costs avoided by running locally, estimated from mission history."}
      </p>

      <div className="overflow-hidden rounded-xl border border-white/8 bg-white/[0.012]">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1.4fr] gap-2 border-b border-white/8 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">
          <span>provider</span>
          <span>tokens</span>
          <span>cost</span>
          <span>note</span>
        </div>
        {rows.map((r) => (
          <div
            key={r.name}
            className="grid grid-cols-[1.4fr_1fr_1fr_1.4fr] items-center gap-2 px-3 py-2 text-[11.5px]"
          >
            <span className={clsx(r.muted ? "text-white/55" : "text-white")}>{r.name}</span>
            <span className="font-mono tabular-nums text-white/70">{r.tokens}</span>
            <span className="font-mono tabular-nums text-white/70">{r.cost}</span>
            <span className="flex flex-col font-mono text-[10px] text-white/45">
              <span>{r.note}</span>
              {r.sub ? <span className="text-white/35">{r.sub}</span> : null}
            </span>
          </div>
        ))}
      </div>

      <ul className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <Metric label="Tokens saved" value={empty ? "needs data" : board.estimatedTokensSaved.toLocaleString()} />
        <Metric label="Avg / mission" value={empty ? "needs data" : avgMissionCost} />
        <Metric label="Monthly est." value={monthlyEstimate} wide />
        <Metric label="Runtime cost" value="$0 · local" tone="ok" />
        <Metric label="Local savings" value={empty ? "needs data" : `${cloudAvoided} cloud avoided`} />
      </ul>

      <p className="rounded-md border border-white/8 bg-white/[0.012] px-2.5 py-1.5 font-mono text-[9.5px] uppercase tracking-wider text-white/40">
        assumes {PRICING.modelLabel} · in {formatUsd(PRICING.inputPer1M)}/1M · out{" "}
        {formatUsd(PRICING.outputPer1M)}/1M — these are avoided cloud costs · real spend $0
      </p>

      {suggestions.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {suggestions.map((s) => (
            <li
              key={s}
              className="flex items-center gap-1.5 rounded-md border border-accent/30 bg-accent/[0.06] px-2 py-1 text-[10.5px] text-accent shadow-glow"
            >
              {s}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

interface Row {
  name: string;
  tokens: string;
  cost: string;
  note: string;
  sub?: string;
  muted?: boolean;
}

function Metric({
  label,
  value,
  tone,
  wide
}: {
  label: string;
  value: string;
  tone?: "ok";
  wide?: boolean;
}) {
  return (
    <li
      className={clsx(
        "flex flex-col gap-1 rounded-xl border border-white/8 bg-white/[0.012] p-2.5",
        wide && "col-span-2 md:col-span-1"
      )}
    >
      <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/45">{label}</span>
      <span
        className={clsx(
          "font-mono text-[11px] tabular-nums",
          tone === "ok" ? "text-emerald-200" : "text-white"
        )}
      >
        {value}
      </span>
    </li>
  );
}

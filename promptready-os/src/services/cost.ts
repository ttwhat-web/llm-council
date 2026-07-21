/**
 * Operator Cost Board · Phase 17.
 *
 * Honest cost estimation from real local mission history. The model
 * (input cost, output cost) is exposed as the `PRICING` constant so
 * the user knows exactly what's being assumed.
 */

import type { MissionReceipt } from "@/store/mission";

// Assumed pricing if missions had gone to a typical mid-tier cloud
// model (gpt-4o-mini / claude-haiku tier). Used only for the
// "cloud avoided" estimate. Real cloud spend is always $0 today.
export const PRICING = {
  modelLabel: "gpt-4o-mini-class",
  inputPer1M: 0.15, // USD
  outputPer1M: 0.6 // USD
};

// Conservative token estimate: 1 token ≈ 4 chars for English-y text.
const CHARS_PER_TOKEN = 4;

export interface CostBoard {
  localMissions: number;
  ollamaMissions: number;
  totalDeliverables: number;
  totalOllamaTokens: number;
  totalOllamaLatencyMs: number;
  estimatedTokensSaved: number;
  estimatedCloudCostAvoidedUSD: number;
  estimatedAvgBriefTokens: number;
  estimatedAvgResponseTokens: number;
}

export function computeCostBoard(history: MissionReceipt[]): CostBoard {
  let localMissions = 0;
  let ollamaMissions = 0;
  let totalDeliverables = 0;
  let totalOllamaTokens = 0;
  let totalOllamaLatencyMs = 0;
  let inputCharsSum = 0;
  let outputCharsSum = 0;

  for (const m of history) {
    totalDeliverables += m.deliverables.length;
    if (m.engine === "ollama") {
      ollamaMissions++;
      if (m.llmLatencyMs) totalOllamaLatencyMs += m.llmLatencyMs;
      const modelResp = m.deliverables.find((d) => d.label === "Model Response");
      if (modelResp) {
        totalOllamaTokens += Math.ceil(modelResp.content.length / CHARS_PER_TOKEN);
      }
    } else {
      localMissions++;
    }
    inputCharsSum += m.brief.length;
    // Sum first deliverable content as the "would-have-been LLM response"
    // proxy. Conservative — uses the rules-engine artifact as a stand-in
    // for what a model would have produced.
    if (m.deliverables.length > 0) {
      outputCharsSum += m.deliverables[0].content.length;
    }
  }

  const totalMissions = localMissions + ollamaMissions;
  const avgBriefTokens = totalMissions ? Math.round(inputCharsSum / totalMissions / CHARS_PER_TOKEN) : 0;
  const avgResponseTokens = totalMissions
    ? Math.round(outputCharsSum / totalMissions / CHARS_PER_TOKEN)
    : 0;

  const estimatedTokensSaved =
    Math.ceil(inputCharsSum / CHARS_PER_TOKEN) +
    Math.ceil(outputCharsSum / CHARS_PER_TOKEN);

  const estimatedCloudCostAvoidedUSD =
    (Math.ceil(inputCharsSum / CHARS_PER_TOKEN) / 1_000_000) * PRICING.inputPer1M +
    (Math.ceil(outputCharsSum / CHARS_PER_TOKEN) / 1_000_000) * PRICING.outputPer1M;

  return {
    localMissions,
    ollamaMissions,
    totalDeliverables,
    totalOllamaTokens,
    totalOllamaLatencyMs,
    estimatedTokensSaved,
    estimatedCloudCostAvoidedUSD,
    estimatedAvgBriefTokens: avgBriefTokens,
    estimatedAvgResponseTokens: avgResponseTokens
  };
}

export function formatUsd(n: number): string {
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(4)}`;
}

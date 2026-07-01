/**
 * Operator's read · the felt-intelligence layer on top of the morning.
 *
 * The deterministic engine decides WHAT to surface. This decides HOW A
 * CHIEF OF STAFF WOULD FRAME IT: one or two sentences that rank the
 * morning by Money → Customers → Deadlines → Reputation and tell the
 * founder where to start and why. Grounded in memory, in Operator's
 * voice. This is the difference between "here are 3 things" (a filter)
 * and "start with Bridge, it's the biggest number waiting" (a person).
 *
 * Optional: no AI key → no read, and the deterministic briefing stands
 * on its own. Never invents; only reasons over the items it's given.
 *
 * The prompt builder is pure + unit-tested; the network call is
 * verified on-device.
 */

import type { BriefingItem } from "./types";
import { OPERATOR_SYSTEM_PROMPT } from "@/services/operator/voice";
import { renderMemoryForPrompt } from "@/services/operator/memorySeed";
import type { FounderMemory } from "@/services/operator/memorySeed";

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 160;

interface RawAnthropicResponse {
  content?: Array<{ type: string; text?: string }>;
  error?: { message?: string };
}

export type OperatorReadResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

export function buildOperatorReadPrompt(
  items: BriefingItem[],
  memory: FounderMemory | null
): string {
  const memoryBlock = renderMemoryForPrompt(memory ?? null);
  const list = items
    .map((it, i) => `${i + 1}. [${it.priority}] ${it.fact}`)
    .join("\n");

  const parts: string[] = [];
  if (memoryBlock) parts.push(memoryBlock, "");
  parts.push(
    `This morning's surfaced items, already filtered from the founder's`,
    `real inbox and calendar:`,
    ``,
    list,
    ``,
    `Write the founder's "read" of this morning: 1–2 short sentences,`,
    `no more. Rank by what matters most (money first, then customers,`,
    `then deadlines, then reputation) and say where to start and why.`,
    `Reference the actual items — do not invent anything not listed.`,
    `No greeting, no list, no preamble. Just the read, in your voice.`
  );
  return parts.join("\n");
}

export async function fetchOperatorRead(
  items: BriefingItem[],
  memory: FounderMemory | null,
  apiKey: string | null
): Promise<OperatorReadResult> {
  if (!apiKey) return { ok: false, error: "no-key" };
  if (items.length === 0) return { ok: false, error: "no-items" };

  const prompt = buildOperatorReadPrompt(items, memory);
  let raw: RawAnthropicResponse;
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: OPERATOR_SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }]
      })
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { ok: false, error: `Anthropic ${res.status}: ${t.slice(0, 160) || res.statusText}` };
    }
    raw = (await res.json()) as RawAnthropicResponse;
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  if (raw.error) return { ok: false, error: raw.error.message ?? "Anthropic error" };
  const text = (raw.content ?? [])
    .filter((c) => c.type === "text" && typeof c.text === "string")
    .map((c) => c.text)
    .join(" ")
    .trim();
  if (!text) return { ok: false, error: "empty" };
  return { ok: true, text };
}

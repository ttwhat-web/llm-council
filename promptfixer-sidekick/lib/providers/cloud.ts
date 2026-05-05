/**
 * Cloud provider. Server-side only — API keys MUST NOT be shipped to the
 * browser. Picks Anthropic if ANTHROPIC_API_KEY is set, otherwise OpenAI.
 *
 * Tier-aware model selection:
 *   free → cheap, fast model (Haiku / 4o-mini)
 *   pro  → flagship model (Sonnet / 4o)
 *
 * Override either with CLOUD_MODEL_FREE / CLOUD_MODEL_PRO.
 */

import type { ProviderHealth, ProviderResult } from "../types";
import { fetchWithTimeout, type GenerateOptions, type Provider } from "./types";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";
const OPENAI_KEY = process.env.OPENAI_API_KEY || "";
const CLOUD_TIMEOUT_MS = Number(process.env.CLOUD_TIMEOUT_MS || 20000);

const ANTHROPIC_FREE = process.env.CLOUD_MODEL_FREE || "claude-haiku-4-5-20251001";
const ANTHROPIC_PRO = process.env.CLOUD_MODEL_PRO || "claude-sonnet-4-6";
const OPENAI_FREE = process.env.CLOUD_MODEL_FREE || "gpt-4o-mini";
const OPENAI_PRO = process.env.CLOUD_MODEL_PRO || "gpt-4o";

type Vendor = "anthropic" | "openai" | null;

function vendor(): Vendor {
  if (ANTHROPIC_KEY) return "anthropic";
  if (OPENAI_KEY) return "openai";
  return null;
}

function modelFor(v: Vendor, tier: "free" | "pro"): string {
  if (v === "anthropic") return tier === "pro" ? ANTHROPIC_PRO : ANTHROPIC_FREE;
  if (v === "openai") return tier === "pro" ? OPENAI_PRO : OPENAI_FREE;
  return "";
}

export const cloudProvider: Provider = {
  id: "cloud",
  label: "Cloud AI",

  isConfigured() {
    return vendor() !== null;
  },

  async health(): Promise<ProviderHealth> {
    const v = vendor();
    if (!v) {
      return {
        id: "cloud",
        configured: false,
        reachable: false,
        error: "No ANTHROPIC_API_KEY or OPENAI_API_KEY set."
      };
    }
    return {
      id: "cloud",
      configured: true,
      reachable: true,
      vendor: v,
      model: modelFor(v, "free")
    };
  },

  async generate(prompt: string, options: GenerateOptions = {}): Promise<ProviderResult> {
    const v = vendor();
    const tier = options.tier ?? "free";
    if (!v) {
      return {
        ok: false,
        providerId: "cloud-anthropic",
        model: "",
        content: "",
        latencyMs: 0,
        error: "cloud provider not configured (no API key)"
      };
    }
    return v === "anthropic"
      ? callAnthropic(prompt, options, tier)
      : callOpenAI(prompt, options, tier);
  }
};

async function callAnthropic(
  prompt: string,
  options: GenerateOptions,
  tier: "free" | "pro"
): Promise<ProviderResult> {
  const start = Date.now();
  const model = modelFor("anthropic", tier);
  const system = options.json
    ? `${options.system || ""}\n\nRespond with a single valid JSON object. No code fences, no prose.`
    : options.system;

  try {
    const res = await fetchWithTimeout(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          temperature: options.temperature ?? 0.2,
          system: system?.trim() || undefined,
          messages: [{ role: "user", content: prompt }]
        })
      },
      options.timeoutMs ?? CLOUD_TIMEOUT_MS
    );

    if (!res.ok) {
      const detail = await safeText(res);
      return {
        ok: false,
        providerId: "cloud-anthropic",
        model,
        content: "",
        latencyMs: Date.now() - start,
        error: `anthropic ${res.status}: ${detail.slice(0, 200)}`
      };
    }

    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
      error?: { message?: string };
    };

    if (data.error) {
      return {
        ok: false,
        providerId: "cloud-anthropic",
        model,
        content: "",
        latencyMs: Date.now() - start,
        error: data.error.message || "anthropic returned error"
      };
    }

    const text = (data.content || [])
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text as string)
      .join("\n")
      .trim();

    return {
      ok: true,
      providerId: "cloud-anthropic",
      model,
      content: text,
      latencyMs: Date.now() - start
    };
  } catch (err) {
    return {
      ok: false,
      providerId: "cloud-anthropic",
      model,
      content: "",
      latencyMs: Date.now() - start,
      error: (err as Error).message
    };
  }
}

async function callOpenAI(
  prompt: string,
  options: GenerateOptions,
  tier: "free" | "pro"
): Promise<ProviderResult> {
  const start = Date.now();
  const model = modelFor("openai", tier);
  const messages: Array<{ role: string; content: string }> = [];
  if (options.system) messages.push({ role: "system", content: options.system });
  messages.push({ role: "user", content: prompt });

  try {
    const res = await fetchWithTimeout(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_KEY}`
        },
        body: JSON.stringify({
          model,
          temperature: options.temperature ?? 0.2,
          messages,
          response_format: options.json ? { type: "json_object" } : undefined
        })
      },
      options.timeoutMs ?? CLOUD_TIMEOUT_MS
    );

    if (!res.ok) {
      const detail = await safeText(res);
      return {
        ok: false,
        providerId: "cloud-openai",
        model,
        content: "",
        latencyMs: Date.now() - start,
        error: `openai ${res.status}: ${detail.slice(0, 200)}`
      };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };

    if (data.error) {
      return {
        ok: false,
        providerId: "cloud-openai",
        model,
        content: "",
        latencyMs: Date.now() - start,
        error: data.error.message || "openai returned error"
      };
    }

    const text = (data.choices?.[0]?.message?.content || "").trim();
    return {
      ok: true,
      providerId: "cloud-openai",
      model,
      content: text,
      latencyMs: Date.now() - start
    };
  } catch (err) {
    return {
      ok: false,
      providerId: "cloud-openai",
      model,
      content: "",
      latencyMs: Date.now() - start,
      error: (err as Error).message
    };
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

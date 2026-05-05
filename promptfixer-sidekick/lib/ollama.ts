/**
 * Thin wrapper around the local Ollama HTTP API.
 * Keeps the surface area small: generate(), stream(), health().
 */

const HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "gemma2:2b";
const FALLBACKS = (process.env.OLLAMA_FALLBACKS || "llama3:8b,mistral:7b")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 12000);

export interface OllamaCallOptions {
  model?: string;
  system?: string;
  temperature?: number;
  timeoutMs?: number;
  format?: "json";
}

export interface OllamaResult {
  ok: boolean;
  model: string;
  content: string;
  latencyMs: number;
  error?: string;
}

export async function health(): Promise<{ ok: boolean; models: string[]; error?: string }> {
  try {
    const res = await fetchWithTimeout(`${HOST}/api/tags`, { method: "GET" }, 1500);
    if (!res.ok) return { ok: false, models: [], error: `HTTP ${res.status}` };
    const data = (await res.json()) as { models?: Array<{ name: string }> };
    return { ok: true, models: (data.models || []).map((m) => m.name) };
  } catch (err) {
    return { ok: false, models: [], error: (err as Error).message };
  }
}

export async function callOllama(
  prompt: string,
  options: OllamaCallOptions = {}
): Promise<OllamaResult> {
  const candidates = uniq([options.model || DEFAULT_MODEL, ...FALLBACKS]);
  let lastErr: string | undefined;

  for (const model of candidates) {
    const start = Date.now();
    try {
      const res = await fetchWithTimeout(
        `${HOST}/api/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            prompt,
            system: options.system,
            stream: false,
            format: options.format,
            options: {
              temperature: options.temperature ?? 0.2
            }
          })
        },
        options.timeoutMs ?? TIMEOUT_MS
      );

      if (!res.ok) {
        lastErr = `HTTP ${res.status} from ${model}`;
        continue;
      }

      const data = (await res.json()) as { response?: string; error?: string };
      if (data.error) {
        lastErr = `${model}: ${data.error}`;
        continue;
      }

      return {
        ok: true,
        model,
        content: (data.response ?? "").trim(),
        latencyMs: Date.now() - start
      };
    } catch (err) {
      lastErr = `${model}: ${(err as Error).message}`;
    }
  }

  return {
    ok: false,
    model: candidates[0],
    content: "",
    latencyMs: 0,
    error: lastErr || "no ollama backend reachable"
  };
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

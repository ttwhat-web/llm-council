/**
 * Telegram Live · Sprint A
 *
 * Real adapter on top of the existing bridge simulator. Reads the bot
 * token + allowed chat id from runtime config — NEVER from
 * localStorage. The token can live in:
 *
 *   · `window.__OPERATOR_CONFIG__` (set by the Tauri runtime when a
 *     secure store is wired)
 *   · `import.meta.env.VITE_TELEGRAM_BOT_TOKEN` (build-time, for dev)
 *
 * If neither is present, status stays "simulator" forever. If a token
 * is present but no real API call has succeeded yet, status is
 * "live-ready". Only a successful round-trip within ~5 min flips to
 * "live-connected".
 *
 * Status is held in module-local memory + mirrored to localStorage
 * under a separate key for visibility — the token itself never lands
 * on disk.
 */

import type { MissionReceipt } from "@/store/mission";
import type { WorkflowRun } from "@/store/atlas";
import { auditLog } from "@/services/auditLog";

export type TelegramLiveStatus =
  | "simulator"
  | "live-ready"
  | "live-connected"
  | "error";

interface LiveState {
  lastSendAt: number | null;
  lastPollAt: number | null;
  lastError: string | null;
  lastUpdateId: number;
}

const STATE_KEY = "promptready-os.telegram-live";
const FRESH_MS = 5 * 60 * 1000;

function readState(): LiveState {
  if (typeof window === "undefined") {
    return { lastSendAt: null, lastPollAt: null, lastError: null, lastUpdateId: 0 };
  }
  try {
    const raw = window.localStorage.getItem(STATE_KEY);
    if (!raw) {
      return { lastSendAt: null, lastPollAt: null, lastError: null, lastUpdateId: 0 };
    }
    return JSON.parse(raw) as LiveState;
  } catch {
    return { lastSendAt: null, lastPollAt: null, lastError: null, lastUpdateId: 0 };
  }
}

function writeState(s: LiveState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STATE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

export interface TelegramConfig {
  token: string | null;
  chatId: string | null;
  source: "runtime" | "env" | "none";
}

/**
 * Read token + chat id from runtime config or build-time env. Never
 * reads from localStorage. The desktop runtime should populate
 * `window.__OPERATOR_CONFIG__` from its secure store on boot.
 *
 * Note: literal `import.meta.env.VITE_*` access is required so Vite
 * statically inlines the value at build time. A destructured / cast
 * read returns `{}` because Vite can't trace the indirection.
 */
export function readTelegramConfig(): TelegramConfig {
  const runtime =
    typeof window !== "undefined"
      ? ((window as unknown as { __OPERATOR_CONFIG__?: Record<string, string | undefined> }).__OPERATOR_CONFIG__ ?? {})
      : {};

  // Literal property access — Vite replaces these at build time.
  const envToken: string | undefined = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
  const envChatId: string | undefined = import.meta.env.VITE_TELEGRAM_ALLOWED_CHAT_ID;

  const token = runtime.telegramBotToken || envToken || null;
  const chatId = runtime.telegramAllowedChatId || envChatId || null;

  const source: TelegramConfig["source"] = runtime.telegramBotToken
    ? "runtime"
    : envToken
      ? "env"
      : "none";

  return { token, chatId, source };
}

export interface TelegramBridgeStatusLive {
  live: TelegramLiveStatus;
  hasToken: boolean;
  hasChatId: boolean;
  source: TelegramConfig["source"];
  lastSendAt: number | null;
  lastPollAt: number | null;
  lastError: string | null;
}

export function getTelegramBridgeStatus(): TelegramBridgeStatusLive {
  const cfg = readTelegramConfig();
  const state = readState();
  const hasToken = !!cfg.token;
  const hasChatId = !!cfg.chatId;

  let live: TelegramLiveStatus;
  if (!hasToken) {
    live = "simulator";
  } else if (state.lastError && (!state.lastSendAt || state.lastSendAt < Date.now() - FRESH_MS)) {
    live = "error";
  } else if (state.lastSendAt && state.lastSendAt > Date.now() - FRESH_MS) {
    live = "live-connected";
  } else {
    live = "live-ready";
  }

  return {
    live,
    hasToken,
    hasChatId,
    source: cfg.source,
    lastSendAt: state.lastSendAt,
    lastPollAt: state.lastPollAt,
    lastError: state.lastError
  };
}

/**
 * Real POST to api.telegram.org. Never throws — returns ok/error so
 * callers can fall back to simulator without an exception.
 */
export async function sendTelegramMessage(
  text: string
): Promise<{ ok: boolean; error?: string }> {
  const cfg = readTelegramConfig();
  if (!cfg.token) {
    return { ok: false, error: "no token configured · simulator only" };
  }
  if (!cfg.chatId) {
    return { ok: false, error: "no allowed chat id configured" };
  }
  const url = `https://api.telegram.org/bot${encodeURIComponent(cfg.token)}/sendMessage`;
  const body = {
    chat_id: cfg.chatId,
    text,
    parse_mode: "Markdown",
    disable_web_page_preview: true
  };
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const state = readState();
    if (!r.ok) {
      const errText = await safeText(r);
      const next: LiveState = {
        ...state,
        lastError: `HTTP ${r.status} · ${errText.slice(0, 200)}`
      };
      writeState(next);
      return { ok: false, error: next.lastError ?? "send failed" };
    }
    const next: LiveState = {
      ...state,
      lastSendAt: Date.now(),
      lastError: null
    };
    writeState(next);
    return { ok: true };
  } catch (e) {
    const state = readState();
    const msg = e instanceof Error ? e.message : "unknown network error";
    writeState({ ...state, lastError: msg });
    return { ok: false, error: msg };
  }
}

export async function sendTelegramReceipt(
  receipt: MissionReceipt
): Promise<{ ok: boolean; error?: string }> {
  const lines: string[] = [];
  lines.push(`✅ *Mission complete*`);
  lines.push(`ID: \`${receipt.id}\``);
  lines.push(`Mode: \`${receipt.mode}\` · Quality: \`${receipt.quality}\``);
  if (receipt.engine) lines.push(`Engine: \`${receipt.engine}\`${receipt.model ? ` · ${receipt.model}` : ""}`);
  if (receipt.score != null) lines.push(`Score: ${receipt.score}/100`);
  if (receipt.elapsedMs) lines.push(`Elapsed: ${receipt.elapsedMs}ms`);
  lines.push(`Deliverables: ${receipt.deliverables.length}`);
  lines.push("");
  lines.push(`Brief: ${truncate(receipt.brief, 240)}`);
  lines.push("");
  lines.push(`/receipt ${receipt.id}`);
  return sendTelegramMessage(lines.join("\n"));
}

export async function sendTelegramApprovalRequest(
  run: WorkflowRun
): Promise<{ ok: boolean; error?: string }> {
  const lines: string[] = [];
  lines.push(`🟡 *Workflow paused for approval*`);
  lines.push(`Run: \`${run.id}\``);
  if (run.pausedNodeId) lines.push(`Paused at node: \`${run.pausedNodeId}\``);
  lines.push(`Steps completed: ${run.steps.length}`);
  lines.push("");
  lines.push(`Approve · \`/approve ${run.id}\``);
  lines.push(`Reject  · \`/reject ${run.id}\``);
  return sendTelegramMessage(lines.join("\n"));
}

/**
 * Optional long-poll. Calls /getUpdates once; the caller decides
 * whether to invoke it on a loop. Routes inbound /commands through the
 * existing executeCommand handler.
 */
export async function pollTelegramUpdates(): Promise<{ count: number; error?: string }> {
  const cfg = readTelegramConfig();
  if (!cfg.token) return { count: 0, error: "no token · simulator only" };
  const state = readState();
  const offset = state.lastUpdateId ? state.lastUpdateId + 1 : 0;
  const url = `https://api.telegram.org/bot${encodeURIComponent(cfg.token)}/getUpdates?offset=${offset}&timeout=0`;
  try {
    const r = await fetch(url);
    if (!r.ok) {
      writeState({ ...state, lastError: `poll HTTP ${r.status}` });
      return { count: 0, error: `HTTP ${r.status}` };
    }
    const json = (await r.json()) as {
      ok: boolean;
      result?: Array<{ update_id: number; message?: { chat?: { id?: number | string }; text?: string } }>;
    };
    if (!json.ok || !json.result) {
      writeState({ ...state, lastPollAt: Date.now() });
      return { count: 0 };
    }
    let processed = 0;
    let maxId = state.lastUpdateId;
    const { executeCommand } = await import("@/services/commandConsole");
    for (const update of json.result) {
      if (update.update_id > maxId) maxId = update.update_id;
      const text = update.message?.text;
      const fromChat = String(update.message?.chat?.id ?? "");
      if (!text) continue;
      // Enforce allowed chat id strictly.
      if (cfg.chatId && fromChat !== String(cfg.chatId)) {
        auditLog("telegram.send", {
          direction: "rejected-inbound",
          chat: fromChat,
          reason: "chat-id mismatch"
        });
        continue;
      }
      if (!text.trim().startsWith("/")) continue;
      const result = await executeCommand(text, { remote: true });
      auditLog("telegram.send", { direction: "inbound", command: text.split(" ")[0] });
      await sendTelegramMessage(result.output.slice(0, 3500));
      processed++;
    }
    writeState({
      ...state,
      lastPollAt: Date.now(),
      lastUpdateId: maxId,
      lastError: null
    });
    return { count: processed };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown network error";
    writeState({ ...state, lastError: msg });
    return { count: 0, error: msg };
  }
}

/**
 * Reset persisted live-bridge state (cursor, timestamps, last error).
 * Token + chat id are NOT touched · they live in runtime config only.
 */
export function resetTelegramLiveState() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STATE_KEY);
  } catch {
    // ignore
  }
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
async function safeText(r: Response): Promise<string> {
  try {
    return await r.text();
  } catch {
    return "";
  }
}

export const TELEGRAM_SETUP_NOTES = [
  "1. @BotFather → /newbot → save the token.",
  "2. Find your numeric chat id (DM the bot → curl /getUpdates).",
  "3. Provide them at desktop boot:",
  "     a) Tauri runtime: write to secure store · expose as window.__OPERATOR_CONFIG__",
  "     b) Dev preview:   .env.local with VITE_TELEGRAM_BOT_TOKEN + VITE_TELEGRAM_ALLOWED_CHAT_ID",
  "4. Reload. Settings → Telegram should flip to live-ready.",
  "5. Press 'send test message' · live-connected when the round-trip works.",
  "6. Press 'poll once' to drain /getUpdates and route /commands through the parser.",
  "7. Revoke: clear runtime config and restart · status drops to simulator."
];

/**
 * Telegram BotFather client. Server-side only.
 *
 * The bot token + admin chat id MUST come from process.env. They are
 * never serialised to the browser. Failures are silent — Mission Alerts
 * is a courtesy notification; under no circumstances should it crash
 * the main request lifecycle.
 */

const TOKEN = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
const DEFAULT_CHAT = (process.env.TELEGRAM_ADMIN_CHAT_ID || "").trim();
const SEND_TIMEOUT_MS = Number(process.env.TELEGRAM_TIMEOUT_MS || 6000);

/** Max characters Telegram accepts in a single message. */
const TELEGRAM_MAX = 4096;

export interface TelegramSendOptions {
  /** Override the admin chat id. Useful for per-user routing later. */
  chatId?: string;
  /** "HTML" by default. Telegram's HTML tag set is *very* small. */
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
  /** Default 6000ms. */
  timeoutMs?: number;
}

/** Returns true when both the bot token and an admin chat id are configured. */
export function isTelegramConfigured(): boolean {
  return TOKEN.length > 0 && DEFAULT_CHAT.length > 0;
}

/**
 * Send an alert. Silently skips when not configured. Never throws —
 * promise resolves even on network / Telegram error.
 */
export async function sendTelegramAlert(
  message: string,
  options: TelegramSendOptions = {}
): Promise<{ ok: boolean; reason?: string }> {
  if (!isTelegramConfigured()) {
    return { ok: false, reason: "not configured" };
  }
  if (!message || !message.trim()) {
    return { ok: false, reason: "empty message" };
  }

  const text = message.length > TELEGRAM_MAX ? message.slice(0, TELEGRAM_MAX - 2) + "…" : message;
  const chatId = options.chatId || DEFAULT_CHAT;
  const parseMode = options.parseMode || "HTML";

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), options.timeoutMs ?? SEND_TIMEOUT_MS);

  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true
      }),
      signal: ctrl.signal
    });

    if (!res.ok) {
      // Drain body to a short string for logging — never expose to caller.
      let detail = "";
      try {
        detail = (await res.text()).slice(0, 200);
      } catch {
        /* ignore */
      }
      console.warn(`[telegram] HTTP ${res.status}: ${detail}`);
      return { ok: false, reason: `http_${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    const reason = (err as Error)?.name === "AbortError" ? "timeout" : (err as Error).message;
    console.warn(`[telegram] send failed: ${reason}`);
    return { ok: false, reason };
  } finally {
    clearTimeout(timer);
  }
}

// ---------- text helpers --------------------------------------------------

/**
 * Telegram HTML allows <b>, <i>, <u>, <s>, <a>, <code>, <pre>, <blockquote>.
 * Anything else must be escaped. We escape `& < >` aggressively to avoid
 * malformed-entity errors that 400 the request.
 */
export function escapeHtml(input: unknown): string {
  const s = typeof input === "string" ? input : input == null ? "" : String(input);
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Truncate a user-supplied string to `max` characters with an ellipsis. */
export function truncate(input: unknown, max = 1000): string {
  const s = typeof input === "string" ? input : input == null ? "" : String(input);
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

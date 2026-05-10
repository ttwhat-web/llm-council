/**
 * Telegram link storage — maps PromptFixer users to their Telegram chats.
 *
 * Two domains:
 *   - link codes (PF-XXXXX) — short-lived, in-memory only. The user
 *     requests one, sends `/start CODE` to the bot, the webhook
 *     consumes it. 15-minute TTL, one-time use.
 *   - user→chat links — durable. Survive process restarts via an
 *     optional JSON file (TELEGRAM_LINKS_FILE, default `.data/telegram-links.json`).
 *     Atomic write via temp file + rename. Safe to delete the file —
 *     users just re-link.
 *
 * Production (Vercel/Netlify with ephemeral fs, or multi-instance
 * deploys) should swap the implementation for Redis / Postgres. The
 * exported surface stays the same.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

// ---------- Types ---------------------------------------------------------

export interface LinkCode {
  code: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

export interface UserLink {
  userId: string;
  chatId: string;
  linkedAt: number;
}

export interface LinkSnapshot {
  v: 1;
  links: UserLink[];
  savedAt: number;
}

// ---------- Constants -----------------------------------------------------

const CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const CODE_PREFIX = "PF-";
const CODE_RANDOM_LEN = 5;

const LINKS_FILE = (() => {
  const explicit = process.env.TELEGRAM_LINKS_FILE;
  if (explicit && explicit.trim()) return explicit.trim();
  return path.join(process.cwd(), ".data", "telegram-links.json");
})();

// ---------- In-memory state ----------------------------------------------

const codes = new Map<string, LinkCode>(); // code → entry
const linksByUser = new Map<string, UserLink>(); // userId → link
const linksByChat = new Map<string, UserLink>(); // chatId → link

let hydrated = false;
let hydrating: Promise<void> | null = null;

// ---------- Lifecycle ----------------------------------------------------

/** Read links from disk into memory. Idempotent + safe if file missing. */
export async function hydrateTelegramLinks(): Promise<void> {
  if (hydrated) return;
  if (hydrating) return hydrating;
  hydrating = (async () => {
    try {
      const raw = await fs.readFile(LINKS_FILE, "utf8");
      const snap = JSON.parse(raw) as LinkSnapshot;
      if (snap?.v === 1 && Array.isArray(snap.links)) {
        for (const l of snap.links) {
          if (l && typeof l.userId === "string" && typeof l.chatId === "string") {
            linksByUser.set(l.userId, l);
            linksByChat.set(l.chatId, l);
          }
        }
      }
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code !== "ENOENT") {
        console.warn(`[telegram-links] hydrate failed: ${(err as Error).message}`);
      }
    } finally {
      hydrated = true;
    }
  })();
  return hydrating;
}

/** Best-effort persist. Atomic via temp + rename. Silent on failure. */
async function persist(): Promise<void> {
  const snap: LinkSnapshot = {
    v: 1,
    links: Array.from(linksByUser.values()),
    savedAt: Date.now()
  };
  try {
    await fs.mkdir(path.dirname(LINKS_FILE), { recursive: true });
    const tmp = `${LINKS_FILE}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(snap), "utf8");
    await fs.rename(tmp, LINKS_FILE);
  } catch (err) {
    // Read-only fs (e.g. serverless) — keep in-memory only.
    console.warn(`[telegram-links] persist skipped: ${(err as Error).message}`);
  }
}

// ---------- Codes ---------------------------------------------------------

/**
 * Mint a fresh link code for `userId`. Replaces any existing un-consumed
 * code for the same user (only the latest is valid).
 */
export function createTelegramLinkCode(userId: string): LinkCode {
  pruneExpiredCodes();
  // Drop any existing un-consumed code for this user.
  for (const [c, entry] of codes.entries()) {
    if (entry.userId === userId) codes.delete(c);
  }
  const now = Date.now();
  const entry: LinkCode = {
    code: `${CODE_PREFIX}${randomCode(CODE_RANDOM_LEN)}`,
    userId,
    createdAt: now,
    expiresAt: now + CODE_TTL_MS
  };
  codes.set(entry.code, entry);
  return entry;
}

/**
 * Bind a chat to whichever user the code belongs to.
 * Returns the userId on success; `null` on bad / expired code.
 */
export async function consumeTelegramLinkCode(
  rawCode: string,
  chatId: string | number
): Promise<UserLink | null> {
  await hydrateTelegramLinks();
  pruneExpiredCodes();
  const code = (rawCode || "").trim().toUpperCase();
  const entry = codes.get(code);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    codes.delete(code);
    return null;
  }
  codes.delete(code); // one-time use

  const id = String(chatId);
  // If this chat is already bound to another user, replace the binding.
  const existingForChat = linksByChat.get(id);
  if (existingForChat && existingForChat.userId !== entry.userId) {
    linksByUser.delete(existingForChat.userId);
  }
  // Same user reconnecting from a different chat → drop stale.
  const existingForUser = linksByUser.get(entry.userId);
  if (existingForUser && existingForUser.chatId !== id) {
    linksByChat.delete(existingForUser.chatId);
  }

  const link: UserLink = {
    userId: entry.userId,
    chatId: id,
    linkedAt: Date.now()
  };
  linksByUser.set(entry.userId, link);
  linksByChat.set(id, link);
  await persist();
  return link;
}

function pruneExpiredCodes(now = Date.now()): void {
  for (const [c, entry] of codes.entries()) {
    if (entry.expiresAt < now) codes.delete(c);
  }
}

function randomCode(len: number): string {
  // Crockford-ish base32, no easily confused chars.
  const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  const buf = new Uint8Array(len);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < len; i++) buf[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < len; i++) out += ALPHABET[buf[i] % ALPHABET.length];
  return out;
}

// ---------- Lookups -------------------------------------------------------

export async function getTelegramChatIdForUser(
  userId: string | undefined | null
): Promise<string | null> {
  if (!userId) return null;
  await hydrateTelegramLinks();
  return linksByUser.get(userId)?.chatId ?? null;
}

export async function getTelegramUserForChat(
  chatId: string | number
): Promise<string | null> {
  await hydrateTelegramLinks();
  return linksByChat.get(String(chatId))?.userId ?? null;
}

export async function getTelegramLinkForUser(
  userId: string | undefined | null
): Promise<UserLink | null> {
  if (!userId) return null;
  await hydrateTelegramLinks();
  return linksByUser.get(userId) ?? null;
}

export async function unlinkTelegramUser(userId: string): Promise<boolean> {
  await hydrateTelegramLinks();
  const link = linksByUser.get(userId);
  if (!link) return false;
  linksByUser.delete(userId);
  linksByChat.delete(link.chatId);
  await persist();
  return true;
}

// ---------- Test / introspection helpers ---------------------------------

/** For tests + debugging only. Never call from user-facing surfaces. */
export function _resetTelegramLinks(): void {
  codes.clear();
  linksByUser.clear();
  linksByChat.clear();
  hydrated = false;
  hydrating = null;
}

/**
 * Gmail client. UNVERIFIED against a live account from this sandbox;
 * tested with synthetic fixtures. Shape conforms to the Gmail v1 REST
 * API documentation.
 *
 * Scopes used: gmail.readonly (sync) + gmail.send (the approve→send
 * loop). No modify, no delete — ever. Every send is explicitly
 * approved by the founder, shown, and undoable for 30 seconds before
 * it leaves the queue.
 */

import { ensureAccessToken } from "./oauthClient";
import type { GmailMessage, GmailThread } from "./types";

const API = "https://gmail.googleapis.com/gmail/v1/users/me";

interface ListResponse {
  messages?: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
}

interface RawHeader {
  name: string;
  value: string;
}

interface RawMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: { headers?: RawHeader[] };
}

/**
 * List messages from the user's mailbox over the last `windowDays`
 * days. Uses Gmail's `q=newer_than:Nd` query string.
 */
export async function listRecentMessageIds(windowDays: number, max = 200): Promise<Array<{ id: string; threadId: string }>> {
  const token = await ensureAccessToken();
  const collected: Array<{ id: string; threadId: string }> = [];
  let pageToken: string | undefined;
  let safetyCounter = 0;
  while (collected.length < max && safetyCounter < 5) {
    safetyCounter++;
    const params = new URLSearchParams({
      q: `newer_than:${windowDays}d`,
      maxResults: String(Math.min(100, max - collected.length))
    });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await fetch(`${API}/messages?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Gmail list failed (${res.status}): ${await res.text().catch(() => "")}`);
    const data = (await res.json()) as ListResponse;
    if (data.messages) {
      for (const m of data.messages) collected.push({ id: m.id, threadId: m.threadId });
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return collected;
}

/**
 * Fetch a single message in `metadata` format. Returns a normalised
 * `GmailMessage` suitable for the briefing engine.
 */
export async function getMessage(id: string, selfEmail: string): Promise<GmailMessage | null> {
  const token = await ensureAccessToken();
  const params = new URLSearchParams({
    format: "metadata",
    metadataHeaders: "From"
  });
  // metadataHeaders is repeatable.
  params.append("metadataHeaders", "To");
  params.append("metadataHeaders", "Subject");
  params.append("metadataHeaders", "Date");

  const res = await fetch(`${API}/messages/${id}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Gmail get ${id} failed (${res.status}): ${await res.text().catch(() => "")}`);
  const raw = (await res.json()) as RawMessage;
  return normaliseMessage(raw, selfEmail);
}

function normaliseMessage(raw: RawMessage, selfEmail: string): GmailMessage {
  const headers = raw.payload?.headers ?? [];
  const fromHeader = headerValue(headers, "From");
  const toHeader = headerValue(headers, "To");
  const subject = headerValue(headers, "Subject") ?? "";
  const parsedFrom = parseAddress(fromHeader);
  const toAddresses = parseAddressList(toHeader);
  const labels = (raw.labelIds ?? []).map((l) => l.toLowerCase());
  const isFromMe = parsedFrom.address === selfEmail || labels.includes("sent");
  const isInInbox = labels.includes("inbox");
  const isUnread = labels.includes("unread");
  const dateMs = raw.internalDate ? Number(raw.internalDate) : Date.parse(headerValue(headers, "Date") ?? "");
  return {
    id: raw.id,
    threadId: raw.threadId,
    date: Number.isFinite(dateMs) ? dateMs : 0,
    fromName: parsedFrom.name,
    fromAddress: parsedFrom.address,
    toAddresses,
    subject,
    snippet: raw.snippet ?? "",
    isFromMe,
    isInInbox,
    isUnread,
    labels
  };
}

function headerValue(headers: RawHeader[], name: string): string | undefined {
  const lower = name.toLowerCase();
  for (const h of headers) {
    if (h.name.toLowerCase() === lower) return h.value;
  }
  return undefined;
}

/** Parse `Name <email@x.com>` into { name, address }. */
function parseAddress(raw: string | undefined): { name: string; address: string } {
  if (!raw) return { name: "", address: "" };
  const m = raw.match(/^\s*(?:"?([^"<]*?)"?\s*)?<([^>]+)>\s*$/);
  if (m) {
    return { name: (m[1] ?? "").trim(), address: (m[2] ?? "").trim().toLowerCase() };
  }
  return { name: "", address: raw.trim().toLowerCase() };
}

function parseAddressList(raw: string | undefined): string[] {
  if (!raw) return [];
  // Split on commas not inside quotes/angle brackets.
  const parts: string[] = [];
  let depth = 0;
  let buf = "";
  for (const ch of raw) {
    if (ch === "<") depth++;
    else if (ch === ">") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      parts.push(buf);
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) parts.push(buf);
  return parts.map((p) => parseAddress(p).address).filter(Boolean);
}

/** Fetch the user's own email via the Gmail profile endpoint. */
export async function fetchUserEmail(): Promise<string> {
  const token = await ensureAccessToken();
  const res = await fetch(`${API}/profile`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Gmail profile failed (${res.status}): ${await res.text().catch(() => "")}`);
  const data = (await res.json()) as { emailAddress?: string };
  return (data.emailAddress ?? "").toLowerCase();
}

// ---------------------------------------------------------------------------
// Thread grouping
// ---------------------------------------------------------------------------

export function groupIntoThreads(messages: GmailMessage[]): GmailThread[] {
  const byThread = new Map<string, GmailMessage[]>();
  for (const m of messages) {
    const list = byThread.get(m.threadId) ?? [];
    list.push(m);
    byThread.set(m.threadId, list);
  }
  const threads: GmailThread[] = [];
  for (const [id, list] of byThread) {
    list.sort((a, b) => a.date - b.date);
    threads.push({
      id,
      subject: list[list.length - 1]?.subject ?? "",
      messages: list
    });
  }
  return threads;
}

/**
 * Convenience · fetch the last N days of messages, normalised and
 * grouped. Hard-caps at `maxMessages` to keep first-sync bounded.
 */
export async function syncRecentMail(
  windowDays: number,
  selfEmail: string,
  maxMessages = 200
): Promise<{ messages: GmailMessage[]; threads: GmailThread[] }> {
  const ids = await listRecentMessageIds(windowDays, maxMessages);
  const messages: GmailMessage[] = [];
  for (const { id } of ids) {
    try {
      const m = await getMessage(id, selfEmail);
      if (m) messages.push(m);
    } catch {
      // One bad message must not break the sync.
    }
  }
  return { messages, threads: groupIntoThreads(messages) };
}

// ---------------------------------------------------------------------------
// Send · gmail.send scope. Builds an RFC 2822 message, base64url-encodes
// it, and posts to users/me/messages/send. When `threadId` is provided
// the reply is threaded under the original conversation.
//
// UNVERIFIED against a live account from this sandbox. The MIME builder
// and base64url encoding are unit-tested in tests/sendQueue.test.ts.
// ---------------------------------------------------------------------------

export interface SendMessageInput {
  to: string;
  subject: string;
  body: string;
  /** Thread to reply within (keeps Gmail conversation grouping). */
  threadId?: string;
  /** Message-ID of the email we're replying to, for In-Reply-To. */
  inReplyTo?: string;
}

export interface SendMessageResult {
  id: string;
  threadId: string;
}

/** Build an RFC 2822 message string. Exported for tests. */
export function buildRfc2822(input: SendMessageInput, from: string): string {
  const headers: string[] = [];
  headers.push(`From: ${from}`);
  headers.push(`To: ${input.to}`);
  headers.push(`Subject: ${encodeHeaderWord(input.subject)}`);
  headers.push("MIME-Version: 1.0");
  headers.push('Content-Type: text/plain; charset="UTF-8"');
  headers.push("Content-Transfer-Encoding: 8bit");
  if (input.inReplyTo) {
    headers.push(`In-Reply-To: ${input.inReplyTo}`);
    headers.push(`References: ${input.inReplyTo}`);
  }
  return `${headers.join("\r\n")}\r\n\r\n${input.body}`;
}

/** RFC 2047 encode a header value when it contains non-ASCII. */
export function encodeHeaderWord(value: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  const b64 = base64Utf8(value);
  return `=?UTF-8?B?${b64}?=`;
}

/** base64url(no padding) of a UTF-8 string. Exported for tests. */
export function toBase64Url(raw: string): string {
  const b64 = base64Utf8(raw);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64Utf8(s: string): string {
  // Encode UTF-8 → binary string → base64. btoa exists in the Tauri
  // webview and in the test (jsdom-free) environment via globalThis.
  // The unescape(encodeURIComponent()) dance handles multibyte safely.
  const bytes = unescape(encodeURIComponent(s));
  return btoa(bytes);
}

export async function sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
  const token = await ensureAccessToken();
  const from = await fetchUserEmail();
  const raw = toBase64Url(buildRfc2822(input, from));
  const payload: Record<string, unknown> = { raw };
  if (input.threadId) payload.threadId = input.threadId;
  const res = await fetch(`${API}/messages/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(`Gmail send failed (${res.status}): ${await res.text().catch(() => "")}`);
  }
  const data = (await res.json()) as { id?: string; threadId?: string };
  return { id: data.id ?? "", threadId: data.threadId ?? input.threadId ?? "" };
}

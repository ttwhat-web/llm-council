/**
 * Gmail · read-only client. UNVERIFIED against a live account from
 * this sandbox; tested only with synthetic fixtures via the briefing
 * engine. Shape conforms to the Gmail v1 REST API documentation.
 *
 * Scope used: gmail.readonly. No send, no modify, no delete — ever.
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

/**
 * Drafting service · Anthropic Claude Haiku for short follow-up replies.
 *
 * Tested only against the prompt-construction logic (deterministic).
 * The network call itself is UNVERIFIED from this sandbox — the user
 * must test live on Mac with a real Anthropic API key. The Anthropic
 * API shape is the documented v1/messages contract.
 *
 * Honesty rules:
 *  * No fallback fake draft. If no key, return ok:false with a clear
 *    message — the UI shows "Add an Anthropic API key in Settings".
 *  * Draft body only. No subject invention, no recipient invention.
 *  * Match the language of the most recent customer message — we
 *    instruct the model and rely on its detection.
 *  * Sign off as the founder ("— {firstName}"), never as "Operator".
 */

import type { DraftRequest, DraftResult } from "./types";
import type { GmailMessage } from "@/services/google/types";
import { OPERATOR_SYSTEM_PROMPT } from "@/services/operator/voice";
import { renderMemoryForPrompt } from "@/services/operator/memorySeed";
import { CURRENT_PROMPT_VERSION } from "./promptVersions";

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 400;

interface RawAnthropicResponse {
  content?: Array<{ type: string; text?: string }>;
  error?: { type?: string; message?: string };
}

export function buildDraftPrompt(req: DraftRequest): string {
  const { context, founderFirstName, memory } = req;
  const signature = founderFirstName ? `— ${founderFirstName}` : "—";
  const transcript = context.threadMessages
    .slice(-5)
    .map(messageToTranscriptLine)
    .join("\n\n");

  const memoryBlock = renderMemoryForPrompt(memory ?? null);

  // The system prompt (Operator voice) carries identity, tone, and
  // response rules. This user message carries the task, the data,
  // and — when present — the founder profile block from memory.
  const parts: string[] = [];
  if (memoryBlock) {
    parts.push(memoryBlock, "");
  }
  parts.push(
    `Task: draft a follow-up email body for the customer below.`,
    ``,
    `Customer: ${context.customerName} <${context.customerEmail}>`,
    `Days since their last message: ${context.daysSinceLastInbound}`,
    `Thread subject: ${context.subject || "(no subject)"}`,
    ``,
    `Most recent messages in the thread:`,
    `---`,
    transcript || "(no messages available)",
    `---`,
    ``,
    `Constraints for the body you return:`,
    `  * 2 to 3 sentences. Never longer.`,
    `  * Match the language of the customer's most recent message.`,
    `  * One specific question OR one concrete next step. Not both.`,
    `  * Sign off with exactly: "${signature}"`,
    `  * Return ONLY the email body — no subject line, no "Re: …",`,
    `    no commentary, no quotation marks. Just the text the founder`,
    `    will paste into Gmail.`,
    `  * Do not invent customer-specific facts that are not in the`,
    `    thread or the founder profile above.`
  );
  return parts.join("\n");
}

function messageToTranscriptLine(m: GmailMessage): string {
  const who = m.isFromMe ? "Me" : m.fromName || m.fromAddress;
  const when = new Date(m.date).toISOString().slice(0, 10);
  const subject = m.subject ? ` · ${m.subject}` : "";
  const body = m.snippet || "(empty)";
  return `[${when}] ${who}${subject}\n${body}`;
}

export function buildDraftSubject(context: DraftRequest["context"]): string {
  const s = context.subject || "Following up";
  return /^re:\s/i.test(s) ? s : `Re: ${s}`;
}

export async function draftReply(req: DraftRequest, apiKey: string | null): Promise<DraftResult> {
  if (!apiKey) {
    return {
      ok: false,
      error:
        "No Anthropic API key. Add one in Settings → BYOK · provider keys to enable drafts."
    };
  }
  const prompt = buildDraftPrompt(req);
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
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        error: `Anthropic API ${res.status}: ${text.slice(0, 200) || res.statusText}`
      };
    }
    raw = (await res.json()) as RawAnthropicResponse;
  } catch (e) {
    return { ok: false, error: `Anthropic request failed: ${(e as Error).message}` };
  }
  if (raw.error) {
    return { ok: false, error: raw.error.message ?? "Anthropic returned an error." };
  }
  const body = (raw.content ?? [])
    .filter((c) => c.type === "text" && typeof c.text === "string")
    .map((c) => c.text)
    .join("\n")
    .trim();
  if (!body) {
    return { ok: false, error: "Anthropic returned an empty response." };
  }
  return {
    ok: true,
    draft: {
      to: req.context.customerEmail,
      subject: buildDraftSubject(req.context),
      body,
      customerEmail: req.context.customerEmail,
      promptVersion: CURRENT_PROMPT_VERSION,
      model: MODEL
    }
  };
}

/**
 * Build a Gmail compose URL that pre-fills To / Subject / Body. The
 * founder clicks "Open in Gmail" → Gmail's own compose window opens
 * with the draft loaded → they review and hit Send. No Gmail Send
 * scope needed; the send happens through Gmail's UI exactly as if
 * they'd typed it themselves.
 */
export function buildGmailComposeUrl(draft: { to: string; subject: string; body: string }): string {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: draft.to,
    su: draft.subject,
    body: draft.body
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

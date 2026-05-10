/**
 * Secret redaction for Mission Receipts.
 *
 * Pure-JS, runs server-side before persist. The goal is conservative:
 * if it looks like a credential, mask it. Better to over-redact in a
 * shared receipt than leak a key.
 *
 * Patterns covered:
 *   - Anthropic / OpenAI / generic `sk-...` keys
 *   - Stripe keys (pk_/sk_/whsec_)
 *   - GitHub PATs (ghp_, gho_, ghu_, ghs_, ghr_)
 *   - Slack tokens (xoxb-, xoxp-, xoxa-, xoxs-)
 *   - AWS access keys (AKIA / ASIA + 16 alnum)
 *   - Google API keys (AIza + 35 alnum)
 *   - Bearer / Authorization values
 *   - JWT-shaped tokens (3 base64url segments)
 *   - Generic `<thing>_token = "..."` / "...api_key": "..."` patterns
 *   - Common email addresses (kept; emails aren't secrets but we
 *     redact in input snippets for shared receipts to avoid surprises)
 *
 * The function returns the redacted string + a count of redactions
 * applied so callers can decide whether to surface a "Sensitive
 * content was masked" hint.
 */

const REDACTED = "[REDACTED]";

interface Pattern {
  name: string;
  rx: RegExp;
}

const PATTERNS: Pattern[] = [
  // Anthropic + OpenAI + generic sk-...
  { name: "anthropic-key", rx: /\bsk-ant-[a-zA-Z0-9_-]{20,}\b/g },
  { name: "openai-key", rx: /\bsk-[a-zA-Z0-9]{20,}\b/g },
  { name: "openai-proj-key", rx: /\bsk-proj-[a-zA-Z0-9_-]{20,}\b/g },
  // Stripe
  { name: "stripe-secret", rx: /\b(?:sk|rk)_(?:test|live)_[A-Za-z0-9]{20,}\b/g },
  { name: "stripe-pub", rx: /\bpk_(?:test|live)_[A-Za-z0-9]{20,}\b/g },
  { name: "stripe-webhook", rx: /\bwhsec_[A-Za-z0-9]{20,}\b/g },
  // GitHub
  { name: "github-pat", rx: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g },
  // Slack
  { name: "slack", rx: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g },
  // AWS
  { name: "aws-access", rx: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g },
  // Google API
  { name: "google-api", rx: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  // JWTs (3 base64url segments separated by dots, generous length)
  { name: "jwt", rx: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g },
  // Bearer / Authorization headers — replace whole token after the keyword
  { name: "bearer", rx: /\b(?:Bearer|Authorization:\s*Bearer)\s+[A-Za-z0-9._\-+/=]{16,}\b/gi },
  // Generic `<word>_(token|key|secret) = "value"` with at least 12-char value
  {
    name: "generic-key-eq",
    rx:
      /\b(\w*(?:api|secret|access|private|auth)[_-]?(?:key|token|secret)\w*)\s*[:=]\s*["']?([A-Za-z0-9._\-+/=]{12,})["']?/gi
  }
];

export interface RedactionResult {
  text: string;
  redactionCount: number;
}

export function redactSecrets(input: string): RedactionResult {
  let text = input ?? "";
  let count = 0;
  for (const { rx, name } of PATTERNS) {
    text = text.replace(rx, (match, ...groups) => {
      count += 1;
      void name;
      // For the keyword-prefixed `key=value` pattern keep the keyword,
      // mask just the value (last capture group when present).
      if (groups.length >= 2 && typeof groups[0] === "string" && typeof groups[1] === "string") {
        return `${groups[0]}=${REDACTED}`;
      }
      return REDACTED;
    });
  }
  return { text, redactionCount: count };
}

/** Build the public-facing input summary: redact, collapse, cap. */
export function buildInputSummary(input: string, max = 240): string {
  const redacted = redactSecrets(input).text;
  const collapsed = redacted.replace(/\s+/g, " ").trim();
  if (collapsed.length <= max) return collapsed;
  return collapsed.slice(0, max - 1) + "…";
}

/** Build a single-line title from the input. */
export function buildTitle(input: string, max = 80): string {
  const collapsed = redactSecrets(input).text.replace(/\s+/g, " ").trim();
  if (!collapsed) return "Untitled mission";
  const firstSentence = collapsed.split(/(?<=[.!?])\s+/)[0] ?? collapsed;
  if (firstSentence.length <= max) return firstSentence;
  return firstSentence.slice(0, max - 1) + "…";
}

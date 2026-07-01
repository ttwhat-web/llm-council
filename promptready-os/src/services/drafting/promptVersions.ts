/**
 * Prompt version registry · every revision must prove itself.
 *
 * Bump CURRENT_PROMPT_VERSION whenever buildDraftPrompt's template
 * changes and add an entry below with a one-line note on what
 * changed. computeVersionStats() then compares production
 * approval-without-edit rates across versions from real founder
 * feedback — never from opinion. A new version only stays active if
 * it beats (or is at least not worse than) the one it replaced; if it
 * loses, revert CURRENT_PROMPT_VERSION to the prior entry.
 *
 * No dashboard here — this is read by whoever is iterating the prompt
 * (via FeedbackCard's export), not surfaced to the founder as a
 * feature. The data exists to improve Operator, not to impress anyone.
 */

export interface PromptVersionEntry {
  version: string;
  note: string;
}

export const PROMPT_VERSIONS: PromptVersionEntry[] = [
  { version: "v1", note: "Initial tracked version — 2-3 sentences, one ask, memory-aware." }
];

export const CURRENT_PROMPT_VERSION = PROMPT_VERSIONS[PROMPT_VERSIONS.length - 1].version;

export interface PromptVersionStats {
  version: string;
  perfect: number;
  neededEdits: number;
  notUsable: number;
  total: number;
  /** perfect / total, 0..1. null when no feedback yet for this version. */
  approvalWithoutEditRate: number | null;
}

/** Pure · group feedback ratings by prompt version and score each one. */
export function computeVersionStats(
  feedback: Array<{ promptVersion: string; rating: "perfect" | "needed_edits" | "not_usable" }>
): PromptVersionStats[] {
  const byVersion = new Map<string, PromptVersionStats>();
  for (const f of feedback) {
    let s = byVersion.get(f.promptVersion);
    if (!s) {
      s = { version: f.promptVersion, perfect: 0, neededEdits: 0, notUsable: 0, total: 0, approvalWithoutEditRate: null };
      byVersion.set(f.promptVersion, s);
    }
    s.total++;
    if (f.rating === "perfect") s.perfect++;
    else if (f.rating === "needed_edits") s.neededEdits++;
    else s.notUsable++;
  }
  for (const s of byVersion.values()) {
    s.approvalWithoutEditRate = s.total === 0 ? null : s.perfect / s.total;
  }
  return Array.from(byVersion.values()).sort((a, b) => a.version.localeCompare(b.version));
}

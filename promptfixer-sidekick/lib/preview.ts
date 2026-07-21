/**
 * Execution Preview — what an AI tool would *probably* return given the
 * execution-ready prompt.
 *
 * Two paths:
 *
 *   1. AI path — the cloud or ollama provider runs the prompt with a
 *      preview-oriented system message and returns its response. Metered
 *      like a normal cloud call.
 *
 *   2. Deterministic path — when no AI engine is reachable, return a
 *      mode-specific *template* labelled clearly as a deterministic
 *      preview so the user sees the shape of an answer without paying
 *      for one.
 *
 * Every preview is labelled "AI response preview" and never claimed as
 * the final authoritative answer. That label lives in the UI.
 */

import type { Mode } from "./types";

export const PREVIEW_SYSTEM = `You are previewing the kind of response an AI assistant would produce for the user-supplied prompt below.

Rules:
- Produce a complete-looking response in the format the prompt requests.
- Keep it concise — under ~600 words.
- Do not ask clarifying questions. Make reasonable assumptions and call them out briefly.
- Stay inside the structure the prompt demands (XML / markdown / unified diff / numbered procedure / etc.).
- Do not preface with "here's a preview" — just produce the response.`;

export function deterministicPreview(mode: Mode): string {
  return TEMPLATES[mode] ?? TEMPLATES.general;
}

const TEMPLATES: Record<Mode, string> = {
  general:
    [
      "**Answer.** A short, direct response would land here, written in markdown so it scans well.",
      "",
      "Supporting points:",
      "- First specific reason or fact",
      "- Second, with a number or boundary",
      "- Third, narrowing scope",
      "",
      "Assumptions made: the input describes a single, well-scoped task. If that's wrong, re-run with more context."
    ].join("\n"),

  claude:
    [
      "<thinking>",
      "Restate the task in one line. List the constraints. Identify the deliverable.",
      "</thinking>",
      "",
      "<answer>",
      "A complete, concise answer in the shape the prompt asks for.",
      "",
      "- Specific point one",
      "- Specific point two with a measurable threshold",
      "",
      "Assumptions called out at the top so the reader can correct course.",
      "</answer>"
    ].join("\n"),

  chatgpt:
    [
      "## Answer",
      "Direct response, leading with the deliverable. No filler preface.",
      "",
      "## Why",
      "- Reason one — concrete, not hand-wavy",
      "- Reason two — with a number where it matters",
      "",
      "## Next Steps",
      "- Action 1",
      "- Action 2",
      "- Action 3"
    ].join("\n"),

  gemini:
    [
      "## Outcome",
      "Direct one-line statement of what shipped.",
      "",
      "## Plan",
      "```json",
      "{",
      "  \"phases\": [",
      "    { \"name\": \"discover\", \"deliverables\": [\"interview notes\"] },",
      "    { \"name\": \"build\",    \"deliverables\": [\"v1 prototype\"] }",
      "  ]",
      "}",
      "```",
      "",
      "## Assumptions",
      "- Single user persona — adjust if multi-tenant.",
      "- Cloud region pinned to us-east-1.",
      "- No regulated data in scope."
    ].join("\n"),

  cursor:
    [
      "### src/lib/example.ts",
      "```diff",
      "- const items = data.filter(x => x.active)",
      "+ const items = data.filter((x) => x.active && !x.archived)",
      "+",
      "+ if (items.length === 0) return EMPTY",
      "```",
      "",
      "### src/lib/example.test.ts",
      "```diff",
      "+ test(\"excludes archived\", () => {",
      "+   expect(filterActive(fixtures.archivedOnly)).toEqual([])",
      "+ })",
      "```",
      "",
      "**Verify:** `npm test -- src/lib/example.test.ts`"
    ].join("\n"),

  dev:
    [
      "```ts",
      "// patched code",
      "export function reorder(items: Item[]): Item[] {",
      "  return [...items].sort((a, b) => a.priority - b.priority);",
      "}",
      "```",
      "",
      "**Why**",
      "- Stable sort is required by the caller — `[...items]` avoids mutating the input.",
      "- Numeric subtraction handles ties deterministically.",
      "- Edge cases: empty array → returns empty; equal priorities preserve insertion order.",
      "",
      "**Verify**",
      "- `vitest run reorder.test.ts`",
      "- Manually reorder a list of 100 items and confirm priority < N comes first.",
      "- `npm run typecheck`"
    ].join("\n"),

  terminal:
    [
      "```bash",
      "# 1. dry-run — list what would be touched",
      "find . -type f -name '*.tmp' | head -20",
      "",
      "# 2. live run — only after the dry-run output is reviewed",
      "find . -type f -name '*.tmp' -delete",
      "```",
      "",
      "**Rollback**",
      "```bash",
      "# Tmp files are reproduced on the next build; nothing to restore.",
      "# If you need a restore window, snapshot first with:",
      "#   tar -czf /tmp/backup.tgz $(find . -name '*.tmp')",
      "```"
    ].join("\n"),

  business:
    [
      "**TL;DR** — Approve plan A by Friday; it cuts time-to-ship from 8 weeks to 5.",
      "",
      "Body:",
      "- Plan A reuses the existing pipeline; Plan B requires a rewrite.",
      "- Risk on Plan A is integration testing — already scoped at 1 week.",
      "- Both plans hit the Q3 commit. Plan B slips Q4.",
      "- Cost delta: Plan A ~$24k, Plan B ~$140k.",
      "",
      "**Recommendation:** Greenlight Plan A with the existing team. Re-evaluate Plan B at end of Q3.",
      "",
      "Open questions:",
      "- Do we need security review before Plan A merges?",
      "- Who owns the rollout comms?"
    ].join("\n"),

  as400:
    [
      "1. **Snapshot the source object**",
      "   - Cmd: `DSPSRCPF FILE(LEGACYLIB/QRPGLESRC) MBR(STKAPI)`",
      "   - Purpose: capture pre-change state for the change ticket.",
      "   - Backout: read-only — no change.",
      "",
      "2. **Compile the modernised module**",
      "   - Cmd: `CRTSQLRPGI OBJ(LEGACYLIB/STKAPI2) SRCFILE(LEGACYLIB/QRPGLESRC) MBR(STKAPI) DBGVIEW(*SOURCE)`",
      "   - Purpose: produce the SQL-RPG module without touching the live program.",
      "   - Backout: `DLTOBJ OBJ(LEGACYLIB/STKAPI2) OBJTYPE(*MODULE)`",
      "",
      "3. **Bind program with journaling enabled**",
      "   - Cmd: `CRTPGM PGM(LEGACYLIB/STKAPI2) MODULE(LEGACYLIB/STKAPI2) ACTGRP(*CALLER)`",
      "   - Purpose: wire the module into a callable program.",
      "   - Backout: `DLTPGM PGM(LEGACYLIB/STKAPI2)`",
      "",
      "4. **Smoke test**",
      "   - Cmd: `CALL PGM(LEGACYLIB/STKAPI2) PARM(...)`",
      "   - Expected: PF returns the same row count as the legacy program for a known input.",
      "   - Backout: not applicable.",
      "",
      "**Audit trail**: change ticket, journal receipts, library list at run time, before/after row counts."
    ].join("\n")
};

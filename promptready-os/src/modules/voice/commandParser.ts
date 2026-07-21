/**
 * Voice command parser · Operator Voice Console.
 *
 * Text-first. Takes a typed (or locally transcribed) command and returns
 * a SAFE plan: what Atlas understood, the action it WOULD prepare, a risk
 * level, and whether an approval gate is required. NOTHING here executes.
 * The page consumes the plan to create a queued task + Safe-Action preview
 * and only ever runs local, reversible store actions (note / dispatch /
 * paste-clean / navigation) — never shell, filesystem, or desktop control.
 *
 * Unknown input is never an error: it returns a `blocked` plan with a
 * friendly "try:" hint.
 */

export type VoiceActionType =
  | "note"
  | "mission"
  | "paste-clean"
  | "navigation"
  | "approval"
  | "external-open";

export type RiskLevel = "low" | "medium";

export interface ParsedCommand {
  /** Raw command as typed / transcribed. */
  raw: string;
  /** Human title for the queued task. */
  title: string;
  /** What Atlas understood (plain language). */
  understood: string;
  /** What action the page will prepare (plain language). */
  willHappen: string;
  actionType: VoiceActionType;
  risk: RiskLevel;
  requiresApproval: boolean;
  /** True when the command was not recognised. */
  blocked: boolean;
  /** Optional structured payload the page uses to run the local action. */
  payload?: VoicePayload;
}

export type VoicePayload =
  | { kind: "note"; noteTitle: string; body: string }
  | { kind: "mission"; brief: string; mode: string; quality: string }
  | { kind: "paste-clean"; mode: "open-panel" | "run-current" }
  | { kind: "navigation"; to: string; label: string }
  | { kind: "approval-filter" }
  | { kind: "summarize-receipt" }
  | { kind: "task-list" };

const GROCERY_BODY = [
  "# Grocery shopping",
  "",
  "- [ ] Milk",
  "- [ ] Eggs",
  "- [ ] Bread",
  "- [ ] Coffee",
  "",
  "_Starter list · edit before saving._"
].join("\n");

/** Suggestions surfaced on an unknown command. */
export const COMMAND_HINTS: string[] = [
  "create grocery list",
  "clean this code",
  "open market lab",
  "create claude task <…>",
  "summarize latest receipt",
  "save this as a note <…>",
  "create task list"
];

function stripPrefix(text: string, ...prefixes: string[]): string {
  let out = text.trim();
  for (const p of prefixes) {
    const re = new RegExp(`^${p}\\s*`, "i");
    if (re.test(out)) {
      out = out.replace(re, "").trim();
      break;
    }
  }
  return out;
}

export function parseCommand(input: string): ParsedCommand {
  const raw = input.trim();
  const t = raw.toLowerCase();

  const base = (over: Partial<ParsedCommand>): ParsedCommand => ({
    raw,
    title: raw || "(empty command)",
    understood: "—",
    willHappen: "—",
    actionType: "note",
    risk: "low",
    requiresApproval: false,
    blocked: false,
    ...over
  });

  // grocery list
  if (/\bcreate\b.*\bgrocery\b/.test(t) || /\bgrocery (shopping )?list\b/.test(t)) {
    return base({
      title: "Grocery shopping",
      understood: "Create a grocery shopping list as a local note.",
      willHappen: "Queue a note task with a starter list · save to Brain on demand.",
      actionType: "note",
      risk: "low",
      payload: { kind: "note", noteTitle: "Grocery shopping", body: GROCERY_BODY }
    });
  }

  // smart paste / clean this code → open the Paste Cleaner panel
  if (/\bsmart paste\b/.test(t) || /\bclean this code\b/.test(t)) {
    return base({
      title: "Open Paste Cleaner",
      understood: "Open the Paste Intelligence panel to clean pasted text/code.",
      willHappen: "Focus the Paste Cleaner · you paste · press Clean (no execution).",
      actionType: "paste-clean",
      risk: "low",
      payload: { kind: "paste-clean", mode: "open-panel" }
    });
  }

  // run cleanPaste on current paste box
  if (/\bremove trailing 01\b/.test(t) || /\bclean paste\b/.test(t)) {
    return base({
      title: "Clean current paste",
      understood: "Run the paste cleaner on the current Paste box content.",
      willHappen: "cleanPaste() over the textarea · shows changes + cleaned preview.",
      actionType: "paste-clean",
      risk: "low",
      payload: { kind: "paste-clean", mode: "run-current" }
    });
  }

  // navigation
  const nav = matchNavigation(t);
  if (nav) {
    return base({
      title: `Open ${nav.label}`,
      understood: `Navigate to the ${nav.label} surface.`,
      willHappen: `Route to ${nav.to} inside the app (no external launch).`,
      actionType: "navigation",
      risk: "low",
      payload: { kind: "navigation", to: nav.to, label: nav.label }
    });
  }

  // show approvals → filter the queue to approval items
  if (/\bshow approvals\b/.test(t) || /\bapprovals?\b/.test(t)) {
    return base({
      title: "Show approvals",
      understood: "Filter the task queue to approval-gated items.",
      willHappen: "Queue filter switches to approval tasks (honest · no auto-approve).",
      actionType: "approval",
      risk: "low",
      payload: { kind: "approval-filter" }
    });
  }

  // create claude task / create mission
  if (/\bcreate claude task\b/.test(t) || /\bcreate mission\b/.test(t) || /\bcreate task\b(?!\s+list)/.test(t)) {
    const isClaude = /\bclaude\b/.test(t);
    const brief = stripPrefix(raw, "create claude task", "create mission", "create task");
    return base({
      title: brief ? brief.slice(0, 80) : isClaude ? "Claude task" : "Mission",
      understood: `Prepare a ${isClaude ? "Claude" : "general"} mission brief.`,
      willHappen: `dispatch(brief, "${isClaude ? "claude" : "general"}", "${isClaude ? "code" : "smart"}", null) on confirm.`,
      actionType: "mission",
      risk: "medium",
      requiresApproval: false,
      payload: {
        kind: "mission",
        brief: brief || raw,
        mode: isClaude ? "claude" : "general",
        quality: isClaude ? "code" : "smart"
      }
    });
  }

  // summarize latest receipt
  if (/\bsummarize\b.*\breceipt\b/.test(t) || /\blatest receipt\b/.test(t)) {
    return base({
      title: "Summarize latest receipt",
      understood: "Read the most recent mission receipt and note its real fields.",
      willHappen: "Queue a note built ONLY from real receipt fields (no fabrication).",
      actionType: "note",
      risk: "low",
      payload: { kind: "summarize-receipt" }
    });
  }

  // save this as a note <...>
  if (/\bsave (this )?as a note\b/.test(t) || /\bsave note\b/.test(t)) {
    const body = stripPrefix(raw, "save this as a note", "save as a note", "save note");
    return base({
      title: body ? `Note · ${body.slice(0, 60)}` : "Saved note",
      understood: "Save the given text as a Brain memory note.",
      willHappen: "addMemoryDocs([{ name, ext: 'md', body }]) on confirm.",
      actionType: "note",
      risk: "low",
      payload: {
        kind: "note",
        noteTitle: body ? body.slice(0, 60) : "Voice note",
        body: body || "(empty note)"
      }
    });
  }

  // create task list
  if (/\bcreate task list\b/.test(t) || /\btask list\b/.test(t)) {
    return base({
      title: "Create task list",
      understood: "Seed several pending operator tasks into the queue.",
      willHappen: "Add a small starter set of pending tasks (local only).",
      actionType: "note",
      risk: "low",
      payload: { kind: "task-list" }
    });
  }

  // unknown → blocked, never an error
  return base({
    title: raw ? `Not understood · ${raw.slice(0, 50)}` : "Empty command",
    understood: "Command not recognised.",
    willHappen: `blocked · not understood · try: ${COMMAND_HINTS.slice(0, 3).join(" · ")}`,
    actionType: "note",
    risk: "low",
    requiresApproval: false,
    blocked: true
  });
}

function matchNavigation(t: string): { to: string; label: string } | null {
  if (/\bopen market lab\b/.test(t) || /\bmarket lab\b/.test(t)) return { to: "/market-lab", label: "Market Lab" };
  if (/\bopen atlas\b/.test(t)) return { to: "/", label: "Atlas" };
  if (/\bopen terminal\b/.test(t) || /\bintelligence terminal\b/.test(t)) return { to: "/terminal", label: "Terminal" };
  if (/\bopen settings\b/.test(t)) return { to: "/settings", label: "Settings" };
  return null;
}

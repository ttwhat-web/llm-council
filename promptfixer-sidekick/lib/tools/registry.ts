/**
 * Tool registry — what an Agent can reach into the world with.
 *
 * v1 ships **safe** tools only:
 *   - exports.format       — wrap an existing FixResponse in any of our
 *                            seven export shapes (Cursor / Markdown /
 *                            PRD / Technical Plan / Terminal / Jira /
 *                            GitHub). Pure transformation, server-side.
 *   - alert-inbox.list     — return a user's Mission Alert inbox rows.
 *   - telegram.send-alert  — manual dispatch through the existing
 *                            Telegram pipeline. Already gated by feature
 *                            flag + bot config + per-IP rate limit.
 *
 * Approval / dangerous tools are **declared** so future Skills can
 * reference them by id, but their `run` fails fast with
 * `error: "not_implemented"`. They're wired one at a time, each with
 * its own threat model + consent UI (PROMPTOS.md §Execution Layer).
 */

import { listAlertRecords } from "../alert-inbox";
import { EXPORT_BY_ID, type ExportFormat } from "../exports";
import {
  consumeAlertBudget,
  formatAlertMessage,
  type AlertSeverity,
  type AlertType
} from "../mission-alerts";
import {
  getAdminTelegramChatId,
  hasTelegramToken,
  sendTelegramAlert
} from "../telegram";
import { getTelegramChatIdForUser } from "../telegram-links";
import type { FixResponse } from "../types";
import type { Tool, ToolId } from "./types";

// ============================================================================
// SHIPPED · safe
// ============================================================================

interface ExportsFormatInput {
  format: ExportFormat;
  result: FixResponse;
}
interface ExportsFormatOutput {
  filename: string;
  body: string;
}

const exportsFormat: Tool<ExportsFormatInput, ExportsFormatOutput> = {
  meta: {
    id: "exports.format",
    name: "Format export",
    description:
      "Render a FixResponse in one of the export shapes (Cursor task, Markdown spec, PRD, technical plan, terminal script, Jira ticket, GitHub issue, Claude/ChatGPT/Gemini prompt).",
    status: "shipped",
    risk: "safe",
    scope: "server",
    inputs: [
      { name: "format", type: "ExportFormat", required: true },
      { name: "result", type: "FixResponse", required: true }
    ],
    outputs: [
      { name: "filename", type: "string" },
      { name: "body", type: "string" }
    ]
  },
  async run(input) {
    const t0 = Date.now();
    const def = EXPORT_BY_ID[input.format];
    if (!def) {
      return { ok: false, error: "unknown_format", elapsedMs: Date.now() - t0 };
    }
    return {
      ok: true,
      output: { filename: def.filename(input.result), body: def.format(input.result) },
      elapsedMs: Date.now() - t0
    };
  }
};

interface InboxListInput {
  userEmail: string;
  limit?: number;
}
type InboxListOutput = Awaited<ReturnType<typeof listAlertRecords>>;

const inboxList: Tool<InboxListInput, InboxListOutput> = {
  meta: {
    id: "alert-inbox.list",
    name: "List Mission Alert inbox",
    description:
      "Return the most recent alert records for the supplied user (truncated to limit). Read-only.",
    status: "shipped",
    risk: "safe",
    scope: "server",
    inputs: [
      { name: "userEmail", type: "string", required: true },
      { name: "limit", type: "number" }
    ],
    outputs: [{ name: "records", type: "AlertRecord[]" }]
  },
  async run(input) {
    const t0 = Date.now();
    try {
      const rows = await listAlertRecords(
        input.userEmail,
        Math.max(1, Math.min(100, input.limit ?? 50))
      );
      return { ok: true, output: rows, elapsedMs: Date.now() - t0 };
    } catch (err) {
      return { ok: false, error: (err as Error).message, elapsedMs: Date.now() - t0 };
    }
  }
};

interface TelegramSendInput {
  type: AlertType;
  severity: AlertSeverity;
  mission: string;
  summary: string;
  surface?: string;
  user?: string;
  /** Caller's stable id for rate-limiting (server-derived). */
  clientKey: string;
  /** When set + linked, alert routes to the user's Telegram chat. */
  userEmail?: string;
}
interface TelegramSendOutput {
  sent: boolean;
  reason?: string;
}

const telegramSend: Tool<TelegramSendInput, TelegramSendOutput> = {
  meta: {
    id: "telegram.send-alert",
    name: "Send Telegram alert",
    description:
      "Manual Telegram dispatch through the existing Mission Alerts pipeline. Resolves user-linked chat → admin fallback → skip. Rate-limited per IP.",
    status: "shipped",
    risk: "safe",
    scope: "server",
    inputs: [
      { name: "type", type: "AlertType", required: true },
      { name: "severity", type: "AlertSeverity", required: true },
      { name: "mission", type: "string", required: true },
      { name: "summary", type: "string", required: true },
      { name: "userEmail", type: "string" }
    ],
    outputs: [
      { name: "sent", type: "boolean" },
      { name: "reason", type: "string" }
    ]
  },
  async run(input, ctx) {
    const t0 = Date.now();
    if (!hasTelegramToken()) {
      return { ok: true, output: { sent: false, reason: "no_token" }, elapsedMs: Date.now() - t0 };
    }
    const userChatId = await getTelegramChatIdForUser(input.userEmail).catch(() => null);
    const chatId = userChatId || getAdminTelegramChatId();
    if (!chatId) {
      return { ok: true, output: { sent: false, reason: "no_chat" }, elapsedMs: Date.now() - t0 };
    }
    if (!consumeAlertBudget(`tool:telegram:${input.clientKey}`)) {
      return { ok: true, output: { sent: false, reason: "rate_limited" }, elapsedMs: Date.now() - t0 };
    }
    const text = formatAlertMessage({
      type: input.type,
      severity: input.severity,
      mission: input.mission,
      summary: input.summary,
      surface: input.surface,
      user: input.user
    });
    const send = await sendTelegramAlert(text, { chatId, parseMode: "HTML" });
    void ctx; // unused; kept for symmetry with future tools
    return {
      ok: true,
      output: { sent: send.ok, reason: send.ok ? undefined : send.reason },
      elapsedMs: Date.now() - t0
    };
  }
};

// ============================================================================
// PLANNED · approval / dangerous
// Each entry has a real meta but a runner that fails fast. Dangerous
// tools NEVER ship without explicit consent UI + threat model.
// ============================================================================

const NOT_IMPLEMENTED = async () => ({
  ok: false as const,
  error: "not_implemented",
  elapsedMs: 0
});

const PLANNED_TOOLS: Tool<unknown, unknown>[] = [
  {
    meta: {
      id: "clipboard.write",
      name: "Write clipboard",
      description: "Write text to the OS clipboard. Client-only; the desktop shell exposes this via tauri-plugin-clipboard-manager.",
      status: "planned",
      risk: "safe",
      scope: "client"
    },
    run: NOT_IMPLEMENTED
  },
  {
    meta: {
      id: "files.read",
      name: "Read file",
      description: "Read a file from a permitted path. Server-side; access controlled by an allowlist.",
      status: "planned",
      risk: "safe",
      scope: "server"
    },
    run: NOT_IMPLEMENTED
  },
  {
    meta: {
      id: "files.write",
      name: "Write file",
      description: "Write a file inside a sandboxed workspace. Approval-tier — every call shows the diff first.",
      status: "planned",
      risk: "approval",
      scope: "server"
    },
    run: NOT_IMPLEMENTED
  },
  {
    meta: {
      id: "http.fetch",
      name: "HTTP fetch",
      description: "GET a URL through a server-side allowlist. Used by Researcher and Crypto Analyst skills.",
      status: "planned",
      risk: "safe",
      scope: "server"
    },
    run: NOT_IMPLEMENTED
  },
  {
    meta: {
      id: "github.create-issue",
      name: "Create GitHub issue",
      description: "Create an issue on the user's repo via personal access token. Approval-tier.",
      status: "planned",
      risk: "approval",
      scope: "server"
    },
    run: NOT_IMPLEMENTED
  },
  {
    meta: {
      id: "github.create-pr",
      name: "Create GitHub PR",
      description: "Open a pull request. Approval-tier per call; previews the diff + commits before consent.",
      status: "planned",
      risk: "approval",
      scope: "server"
    },
    run: NOT_IMPLEMENTED
  },
  {
    meta: {
      id: "terminal.exec",
      name: "Execute shell command",
      description: "Run a shell command in a sandboxed workspace. DANGEROUS — explicit consent + dry-run + safety screen on every call.",
      status: "planned",
      risk: "dangerous",
      scope: "server"
    },
    run: NOT_IMPLEMENTED
  },
  {
    meta: {
      id: "browser.open",
      name: "Open browser tab",
      description: "Hand off a URL to the user's default browser via the Multi-AI Launcher path. Client-side.",
      status: "planned",
      risk: "safe",
      scope: "client"
    },
    run: NOT_IMPLEMENTED
  },
  {
    meta: {
      id: "deploy.trigger",
      name: "Trigger deploy",
      description: "Kick a deploy via the configured CI provider. DANGEROUS — explicit consent per environment.",
      status: "planned",
      risk: "dangerous",
      scope: "server"
    },
    run: NOT_IMPLEMENTED
  },
  {
    meta: {
      id: "webhook.send",
      name: "Send webhook",
      description: "POST to a registered webhook URL. Approval-tier — observable side effect.",
      status: "planned",
      risk: "approval",
      scope: "server"
    },
    run: NOT_IMPLEMENTED
  }
];

// ============================================================================
// Registry surface
// ============================================================================

type AnyTool = Tool<unknown, unknown>;

const SHIPPED: AnyTool[] = [
  exportsFormat as AnyTool,
  inboxList as AnyTool,
  telegramSend as AnyTool
];
const ALL: AnyTool[] = [...SHIPPED, ...(PLANNED_TOOLS as AnyTool[])];
const BY_ID = new Map<ToolId, AnyTool>(ALL.map((t) => [t.meta.id, t]));

export function listTools(): AnyTool[] {
  return ALL.slice();
}

export function listShippedTools(): AnyTool[] {
  return SHIPPED.slice();
}

export function getTool(id: ToolId): AnyTool | null {
  return BY_ID.get(id) ?? null;
}

export function listToolCatalogue() {
  return ALL.map((t) => ({ ...t.meta }));
}

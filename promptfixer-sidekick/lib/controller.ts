import { ACTIONS } from "./actions";
import { renderPrompt } from "./engine";
import type { Provider } from "./providers";
import type {
  ClientContext,
  Mode,
  OutputAction,
  PromptSections,
  SupervisorReview,
  Tier
} from "./types";

const SUPERVISOR_SYSTEM = `You are PromptFixer's supervisor.
You DO NOT write the final answer for the user.
You audit a structured prompt that another assistant will execute.
Your job: tighten language, remove redundancy, fix vague constraints, and make output_format unambiguous.
Never invent facts. Never add unsafe instructions. Never lengthen the prompt for its own sake.
Return STRICT JSON, no prose, matching the schema you are given.`;

interface CommonArgs {
  provider: Provider;
  requestedEngine: SupervisorReview["requestedEngine"];
  resolvedEngine: SupervisorReview["engine"];
  clientContext: ClientContext;
  allowCloudFallback: boolean;
  fallbackUsed: boolean;
  sections: PromptSections;
  mode: Mode;
  tier: Tier;
  /** Forwarded to the provider — wins over tier-based defaults. */
  modelOverride?: string;
}

interface ReviewArgs extends CommonArgs {
  rawInput: string;
}

interface TransformArgs extends CommonArgs {
  action: OutputAction;
}

interface SupervisorJSON {
  role?: string;
  task?: string;
  context?: string;
  constraints?: string[];
  output_format?: string;
  notes?: string;
}

const SCHEMA = {
  role: "string",
  task: "string",
  context: "string",
  constraints: ["string"],
  output_format: "string",
  notes: "string (one short sentence on what you changed and why)"
};

export async function runSupervisor(args: ReviewArgs): Promise<SupervisorReview> {
  const { provider, sections, mode, rawInput } = args;

  if (provider.id === "deterministic") return skipped(args);

  const draft = renderPrompt(sections, mode);
  const prompt = [
    `MODE: ${mode}`,
    `ORIGINAL_USER_INPUT:`,
    fence(rawInput),
    `DRAFT_PROMPT:`,
    fence(draft),
    "",
    "Audit the DRAFT_PROMPT. Improve it where genuinely useful. Keep all five sections.",
    "Respond with JSON only, matching this schema:",
    JSON.stringify(SCHEMA, null, 2)
  ].join("\n");

  return runProviderAndShape(args, prompt);
}

/**
 * Apply an OutputAction to existing sections. The supervisor receives the
 * sections and a transformation instruction; on failure (no AI engine, bad
 * JSON) the deterministic shim from lib/actions.ts mutates the sections.
 */
export async function runTransform(args: TransformArgs): Promise<SupervisorReview> {
  const def = ACTIONS[args.action];
  const targetMode = def.modeOverride ?? args.mode;

  if (args.provider.id === "deterministic") {
    return {
      ...skipped({ ...args, mode: targetMode }),
      improved: def.deterministic(args.sections),
      notes: `applied ${args.action} (deterministic)`
    };
  }

  const draft = renderPrompt(args.sections, targetMode);
  const prompt = [
    `MODE: ${targetMode}`,
    `ACTION: ${args.action}`,
    `INSTRUCTION:`,
    def.instruction,
    "",
    `INPUT_PROMPT:`,
    fence(draft),
    "",
    "Apply the ACTION to the INPUT_PROMPT. Keep all five sections. Do not invent new requirements outside the original scope.",
    "Respond with JSON only, matching this schema:",
    JSON.stringify(SCHEMA, null, 2)
  ].join("\n");

  const review = await runProviderAndShape({ ...args, mode: targetMode }, prompt);

  // If the provider failed or returned non-JSON, fall back to the deterministic
  // shim so the action always produces something useful.
  if (!review.improved) {
    return { ...review, improved: def.deterministic(args.sections), notes: review.notes };
  }
  return review;
}

// ---------- internals ----------

async function runProviderAndShape(
  args: CommonArgs,
  prompt: string
): Promise<SupervisorReview> {
  const result = await args.provider.generate(prompt, {
    system: SUPERVISOR_SYSTEM,
    temperature: 0.1,
    json: true,
    tier: args.tier,
    model: args.modelOverride
  });

  if (!result.ok) {
    return {
      used: false,
      engine: args.resolvedEngine,
      resolved: result.providerId,
      requestedEngine: args.requestedEngine,
      clientContext: args.clientContext,
      allowCloudFallback: args.allowCloudFallback,
      fallbackUsed: args.fallbackUsed,
      error: result.error
    };
  }

  const parsed = safeParse(result.content);
  if (!parsed) {
    return {
      used: true,
      engine: args.resolvedEngine,
      resolved: result.providerId,
      requestedEngine: args.requestedEngine,
      clientContext: args.clientContext,
      allowCloudFallback: args.allowCloudFallback,
      fallbackUsed: args.fallbackUsed,
      model: result.model,
      latencyMs: result.latencyMs,
      error: "supervisor returned non-JSON; keeping deterministic draft",
      notes: result.content.slice(0, 200)
    };
  }

  const improved: PromptSections = {
    role: nonEmpty(parsed.role) || args.sections.role,
    task: nonEmpty(parsed.task) || args.sections.task,
    context: nonEmpty(parsed.context) || args.sections.context,
    constraints:
      Array.isArray(parsed.constraints) && parsed.constraints.length > 0
        ? parsed.constraints.map(String)
        : args.sections.constraints,
    outputFormat: nonEmpty(parsed.output_format) || args.sections.outputFormat
  };

  return {
    used: true,
    engine: args.resolvedEngine,
    resolved: result.providerId,
    requestedEngine: args.requestedEngine,
    clientContext: args.clientContext,
    allowCloudFallback: args.allowCloudFallback,
    fallbackUsed: args.fallbackUsed,
    model: result.model,
    latencyMs: result.latencyMs,
    notes: parsed.notes,
    improved
  };
}

function skipped(args: CommonArgs): SupervisorReview {
  return {
    used: false,
    engine: "deterministic",
    requestedEngine: args.requestedEngine,
    resolved: "deterministic",
    clientContext: args.clientContext,
    allowCloudFallback: args.allowCloudFallback,
    fallbackUsed: args.fallbackUsed
  };
}

function fence(text: string): string {
  return `"""\n${text.trim()}\n"""`;
}

function nonEmpty(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function safeParse(raw: string): SupervisorJSON | null {
  if (!raw) return null;
  const direct = tryJSON(raw);
  if (direct) return direct;
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  return tryJSON(match[0]);
}

function tryJSON(raw: string): SupervisorJSON | null {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as SupervisorJSON) : null;
  } catch {
    return null;
  }
}

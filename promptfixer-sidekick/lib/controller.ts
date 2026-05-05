import { renderPrompt } from "./engine";
import type { Provider } from "./providers";
import type { ClientContext, Mode, PromptSections, SupervisorReview, Tier } from "./types";

const SUPERVISOR_SYSTEM = `You are PromptFixer's supervisor.
You DO NOT write the final answer for the user.
You audit a structured prompt that another assistant will execute.
Your job: tighten language, remove redundancy, fix vague constraints, and make output_format unambiguous.
Never invent facts. Never add unsafe instructions. Never lengthen the prompt for its own sake.
Return STRICT JSON, no prose, matching the schema you are given.`;

interface ReviewArgs {
  provider: Provider;
  requestedEngine: SupervisorReview["requestedEngine"];
  resolvedEngine: SupervisorReview["engine"];
  clientContext: ClientContext;
  allowCloudFallback: boolean;
  fallbackUsed: boolean;
  sections: PromptSections;
  mode: Mode;
  rawInput: string;
  tier: Tier;
}

interface SupervisorJSON {
  role?: string;
  task?: string;
  context?: string;
  constraints?: string[];
  output_format?: string;
  notes?: string;
}

export async function runSupervisor({
  provider,
  requestedEngine,
  resolvedEngine,
  clientContext,
  allowCloudFallback,
  fallbackUsed,
  sections,
  mode,
  rawInput,
  tier
}: ReviewArgs): Promise<SupervisorReview> {
  // Deterministic provider is a no-op sentinel.
  if (provider.id === "deterministic") {
    return {
      used: false,
      engine: "deterministic",
      requestedEngine,
      resolved: "deterministic",
      clientContext,
      allowCloudFallback,
      fallbackUsed
    };
  }

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
    JSON.stringify(
      {
        role: "string",
        task: "string",
        context: "string",
        constraints: ["string"],
        output_format: "string",
        notes: "string (one short sentence on what you changed and why)"
      },
      null,
      2
    )
  ].join("\n");

  const result = await provider.generate(prompt, {
    system: SUPERVISOR_SYSTEM,
    temperature: 0.1,
    json: true,
    tier
  });

  if (!result.ok) {
    return {
      used: false,
      engine: resolvedEngine,
      resolved: result.providerId,
      requestedEngine,
      clientContext,
      allowCloudFallback,
      fallbackUsed,
      error: result.error
    };
  }

  const parsed = safeParse(result.content);
  if (!parsed) {
    return {
      used: true,
      engine: resolvedEngine,
      resolved: result.providerId,
      requestedEngine,
      clientContext,
      allowCloudFallback,
      fallbackUsed,
      model: result.model,
      latencyMs: result.latencyMs,
      error: "supervisor returned non-JSON; keeping deterministic draft",
      notes: result.content.slice(0, 200)
    };
  }

  const improved: PromptSections = {
    role: nonEmpty(parsed.role) || sections.role,
    task: nonEmpty(parsed.task) || sections.task,
    context: nonEmpty(parsed.context) || sections.context,
    constraints:
      Array.isArray(parsed.constraints) && parsed.constraints.length > 0
        ? parsed.constraints.map(String)
        : sections.constraints,
    outputFormat: nonEmpty(parsed.output_format) || sections.outputFormat
  };

  return {
    used: true,
    engine: resolvedEngine,
    resolved: result.providerId,
    requestedEngine,
    clientContext,
    allowCloudFallback,
    fallbackUsed,
    model: result.model,
    latencyMs: result.latencyMs,
    notes: parsed.notes,
    improved
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

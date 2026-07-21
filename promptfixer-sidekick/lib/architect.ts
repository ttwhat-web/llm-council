/**
 * Architect runtime — the "Prompt → Code" engine, lifted out of the
 * route handler so Skills + Workflows + Agents can invoke it directly
 * without the HTTP round-trip.
 *
 * The route (app/api/architect/route.ts) delegates to runArchitect()
 * and adds the request-tied concerns (rate-limit consumption, Mission
 * Alert dispatch, response headers).
 */

import { route } from "./providers";
import { getQuality, resolveCloudModel, resolveOllamaModel } from "./quality";
import type {
  ArchitectPlan,
  ClientContext,
  ModelQuality,
  ProviderId,
  Tier
} from "./types";

const ARCHITECT_SYSTEM = `You are a senior systems architect translating a brief idea into a structured implementation plan.
Be concrete, opinionated, concise. Quantify where possible. Do not invent product features the user didn't ask for.
Return STRICT JSON, no prose, matching the schema below. No code fences, no commentary.`;

const SCHEMA = {
  architecture:
    "string — 1-3 short paragraphs of architectural overview, the spine the rest hangs from",
  stack: {
    frontend: ["string"],
    backend: ["string"],
    infra: ["string"]
  },
  fileTree:
    "string — tree-style monospace listing of the most important files/folders, ASCII (├── └──)",
  prompt:
    "string — execution-ready prompt the user can paste into Claude/Cursor to actually build this",
  roadmap: [
    {
      milestone: "string",
      deliverables: ["string"]
    }
  ],
  deploymentChecklist: ["string"],
  risks: [
    {
      severity: "low | medium | high",
      risk: "string",
      mitigation: "string"
    }
  ]
};

export interface ArchitectRunInput {
  input: string;
  modelQuality?: ModelQuality;
  clientContext?: ClientContext;
  allowCloudFallback?: boolean;
  /** Tier used by the provider for model selection. Defaults to "free". */
  tier?: Tier;
}

export interface ArchitectRunResult {
  ok: true;
  plan: ArchitectPlan;
  resolved: ProviderId;
  model?: string;
  latencyMs?: number;
  isDeterministic: boolean;
  notice?: string;
  /** True iff the plan would route to a cloud provider — caller meters. */
  willHitCloud: boolean;
  elapsedMs: number;
}

export async function runArchitect(args: ArchitectRunInput): Promise<ArchitectRunResult> {
  const t0 = Date.now();
  const input = (args.input || "").trim();
  if (!input) {
    throw new Error("input is required");
  }

  const modelQuality: ModelQuality = args.modelQuality ?? "smart";
  const clientContext: ClientContext = args.clientContext ?? "web";
  const allowCloudFallback =
    modelQuality === "local" && args.allowCloudFallback === true;
  const tier: Tier = args.tier ?? "free";

  const requestedEngine = getQuality(modelQuality).engine;
  const routed = route(requestedEngine, clientContext, { allowCloudFallback });
  const willHitCloud = routed.resolved === "cloud";

  // Deterministic short-circuit.
  if (routed.resolved === "deterministic") {
    return {
      ok: true,
      plan: deterministicPlan(input),
      resolved: "deterministic",
      model: "rules-only",
      isDeterministic: true,
      notice:
        "Deterministic plan — connect a cloud key (or run Ollama) for a generated architecture.",
      willHitCloud: false,
      elapsedMs: Date.now() - t0
    };
  }

  const modelOverride = willHitCloud
    ? resolveCloudModel(modelQuality)
    : routed.resolved === "ollama"
      ? resolveOllamaModel(modelQuality)
      : undefined;

  const userPrompt = [
    `USER_IDEA:`,
    `"""`,
    input,
    `"""`,
    "",
    "Produce the implementation plan as STRICT JSON matching this schema:",
    JSON.stringify(SCHEMA, null, 2)
  ].join("\n");

  const result = await routed.provider.generate(userPrompt, {
    system: ARCHITECT_SYSTEM,
    temperature: 0.2,
    json: true,
    tier,
    model: modelOverride
  });

  if (!result.ok || !result.content.trim()) {
    return {
      ok: true,
      plan: deterministicPlan(input),
      resolved: result.providerId,
      model: result.model,
      latencyMs: result.latencyMs,
      isDeterministic: true,
      notice: result.error
        ? `Live plan unavailable (${result.error}). Showing a deterministic skeleton.`
        : "Live plan returned empty. Showing a deterministic skeleton.",
      willHitCloud,
      elapsedMs: Date.now() - t0
    };
  }

  const plan = parsePlan(result.content) ?? deterministicPlan(input);
  return {
    ok: true,
    plan,
    resolved: result.providerId,
    model: result.model,
    latencyMs: result.latencyMs,
    isDeterministic: false,
    willHitCloud,
    elapsedMs: Date.now() - t0
  };
}

// ---------- parsing ------------------------------------------------------

function parsePlan(raw: string): ArchitectPlan | null {
  if (!raw) return null;
  const direct = tryJSON(raw);
  if (direct) return shape(direct);
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  return shape(tryJSON(match[0]));
}

function tryJSON(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function shape(value: unknown): ArchitectPlan | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const stack = (v.stack as Record<string, unknown> | undefined) ?? {};
  const plan: ArchitectPlan = {
    architecture: str(v.architecture),
    stack: {
      frontend: arr(stack.frontend),
      backend: arr(stack.backend),
      infra: arr(stack.infra)
    },
    fileTree: str(v.fileTree ?? v.file_tree),
    prompt: str(v.prompt),
    roadmap: arrObj(v.roadmap, (r) => ({
      milestone: str(r.milestone),
      deliverables: arr(r.deliverables)
    })),
    deploymentChecklist: arr(v.deploymentChecklist ?? v.deployment_checklist),
    risks: arrObj(v.risks, (r) => ({
      severity: severityOf(r.severity),
      risk: str(r.risk),
      mitigation: str(r.mitigation)
    }))
  };
  if (!plan.architecture && !plan.fileTree && !plan.prompt) return null;
  return plan;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === "string" && x.trim()).map((x) => (x as string).trim());
}
function arrObj<T>(v: unknown, f: (x: Record<string, unknown>) => T): T[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is Record<string, unknown> => x !== null && typeof x === "object")
    .map(f);
}
function severityOf(v: unknown): "low" | "medium" | "high" {
  const s = (typeof v === "string" ? v : "").toLowerCase();
  if (s === "high") return "high";
  if (s === "low") return "low";
  return "medium";
}

export function deterministicPlan(input: string): ArchitectPlan {
  const hint = input.length > 60 ? input.slice(0, 57) + "…" : input;
  return {
    architecture:
      `Skeleton plan for: "${hint}". This deterministic plan is a starting shape — connect a cloud key (or run Ollama) for a generated architecture tuned to your idea.`,
    stack: {
      frontend: ["Next.js (App Router)", "TypeScript", "Tailwind"],
      backend: ["Node.js", "tRPC or Next API routes", "Postgres"],
      infra: ["Vercel or Fly.io", "GitHub Actions", "Sentry"]
    },
    fileTree: [
      "app/",
      "├── (marketing)/",
      "├── (app)/",
      "│   ├── dashboard/",
      "│   └── settings/",
      "├── api/",
      "│   └── ...",
      "components/",
      "lib/",
      "tests/"
    ].join("\n"),
    prompt:
      "You are a senior full-stack engineer. Implement the system described above. Lead with the data model, then the API surface, then the UI. Produce code, not prose.",
    roadmap: [
      { milestone: "Week 1 — discovery", deliverables: ["scope doc", "data model draft"] },
      { milestone: "Week 2 — v1", deliverables: ["happy-path UI", "core API"] },
      { milestone: "Week 3 — harden", deliverables: ["auth", "tests", "rate limits"] }
    ],
    deploymentChecklist: [
      "Migrations reviewed and tested on a snapshot",
      "Secrets present in deploy env (no plaintext in repo)",
      "Health and metrics endpoints responding",
      "Rollback runbook attached to the deploy ticket"
    ],
    risks: [
      {
        severity: "medium",
        risk: "Scope creep before v1 ships.",
        mitigation: "Cut anything not on the v1 deliverable list above."
      },
      {
        severity: "low",
        risk: "Stack choice locks in early decisions.",
        mitigation: "Keep DB access behind a single repository module so you can swap later."
      }
    ]
  };
}

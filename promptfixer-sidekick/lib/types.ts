export type Engine = "auto" | "cloud" | "ollama" | "deterministic";

export type Tier = "free" | "pro";

/**
 * Where the request originated from. Drives the *Auto* routing order:
 *   web    → cloud → deterministic              (no Ollama on the server)
 *   mobile → cloud → deterministic              (iPhone can't run Ollama)
 *   desktop → ollama → cloud → deterministic    (Mac shell, prefers local)
 *
 * Default is "web". Detection lives in lib/clientContext.ts on the browser.
 */
export type ClientContext = "web" | "desktop" | "mobile";

export type Mode =
  | "claude"
  | "chatgpt"
  | "cursor"
  | "dev"
  | "terminal"
  | "business"
  | "general"
  | "as400";

/**
 * User-facing model selector. Internal code maps these to specific provider
 * + model identifiers in lib/quality.ts. Raw model names are NEVER exposed
 * to normal users.
 */
export type ModelQuality = "fast" | "smart" | "expert" | "code" | "local";

/**
 * Output transformation actions. Triggered after a successful fix to mutate
 * the rendered prompt without re-running the full clean→engine pipeline.
 */
export type OutputAction =
  | "shorter"
  | "stronger"
  | "safer"
  | "to-claude"
  | "to-chatgpt"
  | "to-cursor"
  | "to-terminal"
  | "split-steps";

export interface ModeProfile {
  id: Mode;
  label: string;
  blurb: string;
  audience: string;
  tone: string;
  formatting: string;
  guardrails: string[];
  systemHints: string[];
}

export interface PromptSections {
  role: string;
  task: string;
  context: string;
  constraints: string[];
  outputFormat: string;
}

export interface SafetyFinding {
  pattern: string;
  severity: "low" | "medium" | "high" | "critical";
  reason: string;
  suggestion: string;
}

export interface SafetyReport {
  blocked: boolean;
  requiresConfirmation: boolean;
  findings: SafetyFinding[];
  rewritten?: string;
}

export interface FixRequest {
  input: string;
  mode?: Mode;
  engine?: Engine;
  autoMode?: boolean;
  clientContext?: ClientContext;
  /**
   * When `engine === "ollama"`, controls whether an unreachable Ollama daemon
   * is allowed to fall through to the cloud provider.
   *
   * Default: **false** — Local Ollama is positioned as local / private /
   * unlimited; silently falling back to a paid cloud API would be a privacy
   * leak and an unexpected cost. Strict mode (the default) falls back to the
   * deterministic engine instead.
   *
   * Set to `true` only when the user has explicitly opted in via the UI.
   * Has no effect when `engine !== "ollama"`.
   */
  allowCloudFallback?: boolean;
  /**
   * User-facing quality knob. Drives both the engine choice (Local → Ollama,
   * everything else → Cloud) and the model id within the cloud provider.
   * Defaults to "fast".
   */
  modelQuality?: ModelQuality;
  /**
   * If set, this is a transform of a previous result rather than a fresh fix.
   * The cleaner / engine pipeline is skipped — the supervisor (or its
   * deterministic shim) rewrites `previousSections` according to the action.
   */
  action?: OutputAction;
  previousSections?: PromptSections;
}

export interface ScoreCard {
  /** 0-100. Lightweight, deterministic. */
  clarity: number;
  specificity: number;
  safety: number;
  modelFit: number;
}

export interface UsageSnapshot {
  tier: Tier;
  used: number;
  limit: number;
  remaining: number;
  resetAt: string;
}

export interface ProviderResult {
  ok: boolean;
  providerId: ProviderId;
  model: string;
  content: string;
  latencyMs: number;
  error?: string;
}

export type ProviderId =
  | "cloud-anthropic"
  | "cloud-openai"
  | "ollama"
  | "deterministic";

export interface SupervisorReview {
  used: boolean;
  engine: Engine;
  resolved: ProviderId;
  requestedEngine: Engine;
  clientContext: ClientContext;
  /** Echoes the request flag so the UI can render the warning banner. */
  allowCloudFallback: boolean;
  fallbackUsed: boolean;
  model?: string;
  latencyMs?: number;
  notes?: string;
  improved?: PromptSections;
  error?: string;
}

export interface FixResponse {
  ok: boolean;
  mode: Mode;
  detectedMode?: Mode;
  cleaned: string;
  prompt: string;
  sections: PromptSections;
  safety: SafetyReport;
  supervisor: SupervisorReview;
  usage?: UsageSnapshot;
  score: ScoreCard;
  modelQuality: ModelQuality;
  action?: OutputAction;
  elapsedMs: number;
}

export interface CleanResponse {
  ok: boolean;
  cleaned: string;
  removed: string[];
  elapsedMs: number;
}

export interface ProviderHealth {
  id: "cloud" | "ollama";
  configured: boolean;
  reachable: boolean;
  vendor?: "anthropic" | "openai";
  model?: string;
  models?: string[];
  endpoint?: string;
  error?: string;
}

/**
 * The ordered list of provider ids that `route(engine, clientContext, opts)`
 * will try, in order. The first configured + reachable provider wins.
 *
 * Note: explicit `ollama` is **strict by default** — it falls back to the
 * deterministic engine, never to cloud, unless the caller opts in via
 * `allowCloudFallback`.
 */
export interface RoutingOrder {
  auto: Record<ClientContext, Array<"cloud" | "ollama" | "deterministic">>;
  cloud: Array<"cloud" | "deterministic">;
  ollama: {
    strict: Array<"ollama" | "deterministic">;
    withCloudFallback: Array<"ollama" | "cloud" | "deterministic">;
  };
  deterministic: Array<"deterministic">;
}

export interface HealthResponse {
  ok: true;
  version: string;
  defaultEngine: Engine;
  cloud: ProviderHealth;
  ollama: ProviderHealth;
  deterministicAvailable: true;
  routing: RoutingOrder;
  limits: {
    free: number;
    pro: number;
  };
}

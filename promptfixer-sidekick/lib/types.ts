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
  | "dev"
  | "terminal"
  | "business"
  | "general"
  | "as400";

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
 * The ordered list of provider ids that `route(engine, clientContext)` will
 * try, in order. The first configured + reachable provider wins.
 *
 * Example payload:
 *   {
 *     auto: {
 *       web:     ["cloud", "deterministic"],
 *       mobile:  ["cloud", "deterministic"],
 *       desktop: ["ollama", "cloud", "deterministic"]
 *     },
 *     cloud:         ["cloud", "deterministic"],
 *     ollama:        ["ollama", "cloud", "deterministic"],
 *     deterministic: ["deterministic"]
 *   }
 */
export interface RoutingOrder {
  auto: Record<ClientContext, Array<"cloud" | "ollama" | "deterministic">>;
  cloud: Array<"cloud" | "deterministic">;
  ollama: Array<"ollama" | "cloud" | "deterministic">;
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

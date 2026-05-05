export type Engine = "auto" | "cloud" | "ollama" | "deterministic";

export type Tier = "free" | "pro";

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

export interface HealthResponse {
  ok: true;
  version: string;
  defaultEngine: Engine;
  cloud: ProviderHealth;
  ollama: ProviderHealth;
  deterministicAvailable: true;
  limits: {
    free: number;
    pro: number;
  };
}

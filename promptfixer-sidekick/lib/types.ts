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
  useLocalAI?: boolean;
  autoMode?: boolean;
}

export interface SupervisorReview {
  used: boolean;
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
  elapsedMs: number;
}

export interface CleanResponse {
  ok: boolean;
  cleaned: string;
  removed: string[];
  elapsedMs: number;
}

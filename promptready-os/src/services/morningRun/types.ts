/**
 * Morning Run · the shape of one completed pipeline run.
 *
 * Every field here is something that actually happened this run — no
 * projections, no "usually" numbers. `skipped` is set (and everything
 * else stays honestly at zero) when there was nothing real to do, e.g.
 * no source connected yet.
 */
export interface MorningRunSummary {
  startedAt: number;
  durationMs: number;
  /** Detector ids that actually surfaced something this run. */
  detectorsFired: string[];
  draftsGenerated: number;
  /** Actions newly registered as "prepared" in the action queue. */
  actionsPrepared: number;
  /** Distinct executor ids touched this run. */
  executorCount: number;
  /** Total input+output tokens across every AI call this run. */
  aiTokens: number;
  /** Total wall-clock ms spent waiting on AI calls this run. */
  aiLatencyMs: number;
  errors: string[];
  /** The felt-intelligence summary, or null if no AI key / nothing to say. */
  operatorRead: string | null;
  /** Set when the run did real-but-minimal work because a precondition
   *  wasn't met (e.g. "Google not connected") — never a fake success. */
  skipped?: string;
}

export function emptyMorningRunSummary(startedAt: number, skipped?: string): MorningRunSummary {
  return {
    startedAt,
    durationMs: 0,
    detectorsFired: [],
    draftsGenerated: 0,
    actionsPrepared: 0,
    executorCount: 0,
    aiTokens: 0,
    aiLatencyMs: 0,
    errors: [],
    operatorRead: null,
    skipped
  };
}

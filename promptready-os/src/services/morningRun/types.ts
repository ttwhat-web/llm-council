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
  /** Of `actionsPrepared`, how many were low-risk inbox noise archived
   *  automatically (only ever set when the founder already granted
   *  gmail.modify). Broken out so the ritual summary can say a real
   *  number instead of reverse-engineering it from the total. */
  archivedPrepared: number;
  /** Whether a calendar conflict was found and (if write access was
   *  granted) a real move was prepared for founder approval. */
  calendarConflictPrepared: boolean;
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
    archivedPrepared: 0,
    calendarConflictPrepared: false,
    executorCount: 0,
    aiTokens: 0,
    aiLatencyMs: 0,
    errors: [],
    operatorRead: null,
    skipped
  };
}

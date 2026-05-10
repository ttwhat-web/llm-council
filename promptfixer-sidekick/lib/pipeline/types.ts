/**
 * Pipeline — the runtime model for multi-stage Skills.
 *
 * Stages are pure-ish steps: each takes the in-flight `Run` value, maybe
 * mutates it, and emits a typed event. The PromptFixer pipeline is
 * built from Stages; the UI's Mission Control PipelineViz consumes the
 * events stream to drive the live indicator strip.
 *
 * The shipped reduction in lib/pipeline/prompt-fixer.ts mirrors the
 * existing lib/ai.ts → fixPrompt() flow exactly. Future skills compose
 * their own stages on the same primitive.
 */

export type StageId =
  // Synthetic — emitted by the runtime around the real stages.
  | "input"
  | "output"
  // The six real stages of the Prompt Fixer pipeline.
  | "intent"
  | "clean"
  | "structure"
  | "constraints"
  | "generate"
  | "validate";

export type StageStatus =
  | "idle"
  | "scanning"
  | "active"
  | "complete"
  | "fallback"
  | "warning";

export interface StageEvent<S extends StageId = StageId> {
  stage: S;
  status: StageStatus;
  /** Wall time at emit, ms since epoch. */
  ts: number;
  /** ms relative to pipeline start. */
  elapsedMs: number;
  /** Free-form per-stage detail surfaced in the UI logs. */
  detail?: string;
}

/**
 * A Stage<R> is a function over the in-flight Run object `R`. It may
 * mutate R, emit events via the supplied emitter, and return either a
 * mutated R or a terminal result. Stages are sequenced by `runPipeline`.
 */
export interface StageRunArgs<R> {
  run: R;
  emit: (event: Omit<StageEvent, "ts" | "elapsedMs">) => void;
  signal?: AbortSignal;
}

export type Stage<R> = {
  id: StageId;
  /** Display name shown in the UI strip. */
  label: string;
  /** Human-readable rationale for what the stage does. */
  description?: string;
  run: (args: StageRunArgs<R>) => Promise<R>;
};

export interface PipelineRun<R> {
  ok: boolean;
  result: R;
  events: StageEvent[];
  elapsedMs: number;
  error?: string;
}

/**
 * Sequential runner. Aborts cleanly on `signal`. Catches stage-level
 * exceptions and converts them to terminal events so the UI can show
 * the failure inline rather than crashing the request.
 */
export async function runPipeline<R>(
  stages: Stage<R>[],
  initial: R,
  signal?: AbortSignal
): Promise<PipelineRun<R>> {
  const start = Date.now();
  const events: StageEvent[] = [];
  const emit = (e: Omit<StageEvent, "ts" | "elapsedMs">) => {
    const now = Date.now();
    events.push({ ...e, ts: now, elapsedMs: now - start });
  };

  let run = initial;
  try {
    for (const stage of stages) {
      if (signal?.aborted) {
        emit({ stage: stage.id, status: "warning", detail: "aborted" });
        return {
          ok: false,
          result: run,
          events,
          elapsedMs: Date.now() - start,
          error: "aborted"
        };
      }
      emit({ stage: stage.id, status: "active" });
      try {
        run = await stage.run({ run, emit, signal });
        emit({ stage: stage.id, status: "complete" });
      } catch (err) {
        emit({
          stage: stage.id,
          status: "warning",
          detail: (err as Error)?.message?.slice(0, 240)
        });
        return {
          ok: false,
          result: run,
          events,
          elapsedMs: Date.now() - start,
          error: (err as Error).message
        };
      }
    }
    return { ok: true, result: run, events, elapsedMs: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      result: run,
      events,
      elapsedMs: Date.now() - start,
      error: (err as Error).message
    };
  }
}

/**
 * Executor registry · the single place Operator's verbs live.
 *
 * Executors register themselves here at module load (see index.ts).
 * The action queue resolves an executor by id when it's time to run.
 * Adding a capability = registering an executor. No UI, no routing
 * config, no swarm dashboard — the founder never sees this.
 */

import type { Executor } from "./types";

const registry = new Map<string, Executor>();

export function registerExecutor(executor: Executor): void {
  registry.set(executor.id, executor);
}

export function getExecutor(id: string): Executor | undefined {
  return registry.get(id);
}

export function listExecutors(): Executor[] {
  return [...registry.values()];
}

/** Test seam · wipe the registry between tests. */
export function __clearRegistryForTests(): void {
  registry.clear();
}

/**
 * Skill registry — the canonical lookup for every Skill the system
 * knows about (shipped or planned). The `/api/skills` endpoint, the
 * future command palette, and the workflow builder all read from here.
 *
 * Type erasure note: the registry intentionally stores
 * `Skill<unknown, unknown>` because lookups are by id at runtime. Use
 * the typed module exports (`promptFixerSkill`, `architectSkill`, …)
 * for compile-time-safe direct calls.
 */

import { architectSkill } from "./architect";
import { plannedSkills } from "./declared";
import { promptCleanerSkill } from "./prompt-cleaner";
import { promptFixerSkill } from "./prompt-fixer";
import type { Skill, SkillId, SkillMeta } from "./types";

type AnySkill = Skill<unknown, unknown>;

const SHIPPED: AnySkill[] = [
  promptFixerSkill as AnySkill,
  promptCleanerSkill as AnySkill,
  architectSkill as AnySkill
];

const ALL: AnySkill[] = [...SHIPPED, ...plannedSkills()];

const BY_ID = new Map<SkillId, AnySkill>(ALL.map((s) => [s.meta.id, s]));

/** Read-only view of every registered skill, in registration order. */
export function listSkills(): AnySkill[] {
  return ALL.slice();
}

/** Read-only view limited to skills that actually run today. */
export function listShippedSkills(): AnySkill[] {
  return SHIPPED.slice();
}

/** Resolve a skill by id; null if unknown. */
export function getSkill(id: SkillId): AnySkill | null {
  return BY_ID.get(id) ?? null;
}

/**
 * Lightweight catalogue rows for the registry endpoint + UI listings.
 * Excludes the runner; never serialises secrets / closures.
 */
export interface SkillCatalogueRow extends SkillMeta {}

export function listSkillCatalogue(): SkillCatalogueRow[] {
  return ALL.map((s) => ({ ...s.meta }));
}

/**
 * Saved workflow library.
 *
 * Each saved workflow is a `WorkflowDefinition` whose nodes reference
 * the shipped skill + tool ids. Inputs are pulled from the run-level
 * `$input` ref (see lib/workflows/runner.ts → WORKFLOW_INPUT_ID).
 *
 * v1 ships one entry: `fix-clean-architect`. The runner already executes
 * it end-to-end; the UI surface is the Skills Explorer panel.
 */

import { WORKFLOW_INPUT_ID } from "./runner";
import type { WorkflowDefinition } from "./types";

const fixCleanArchitect: WorkflowDefinition = {
  id: "fix-clean-architect",
  name: "Fix → Clean → Architect",
  description:
    "Run the user's input through every shipped skill in turn: optimise the prompt, strip the noise, and produce a structured implementation plan.",
  nodes: [
    {
      id: "fix",
      kind: "skill",
      ref: "prompt-fixer",
      label: "Prompt Fixer",
      input: { kind: "ref", from: WORKFLOW_INPUT_ID }
    },
    {
      id: "clean",
      kind: "skill",
      ref: "prompt-cleaner",
      label: "Prompt Cleaner",
      input: { kind: "ref", from: WORKFLOW_INPUT_ID }
    },
    {
      id: "architect",
      kind: "skill",
      ref: "architect",
      label: "Architect",
      input: { kind: "ref", from: WORKFLOW_INPUT_ID }
    }
  ]
};

const ALL: WorkflowDefinition[] = [fixCleanArchitect];

export function listSavedWorkflows(): WorkflowDefinition[] {
  return ALL.slice();
}

export function getSavedWorkflow(id: string): WorkflowDefinition | null {
  return ALL.find((w) => w.id === id) ?? null;
}

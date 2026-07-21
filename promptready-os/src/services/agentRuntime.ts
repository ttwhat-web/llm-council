/**
 * Agent runtime · Phase 22.
 *
 * A tiny scheduler that walks attached agents on a manual "tick". An
 * agent's only powers are:
 *
 *   · read the last receipt
 *   · spawn a follow-up mission (one at a time)
 *   · attach a context note
 *
 * No autonomous internet. No background polling. The user clicks
 * "Run tick" or schedules ticks themselves. Every spawn is recorded
 * as a real mission receipt the operator can audit.
 *
 * Agent types are intentionally narrow — they each transform a
 * receipt into a templated follow-up brief.
 */

import { useMissionStore, type MissionReceipt } from "@/store/mission";
import { useAtlasStore, type AgentKind, type AgentState } from "@/store/atlas";

export type AgentTickResult =
  | { ok: true; agent: AgentKind; receiptId: string; message: string }
  | { ok: false; agent: AgentKind; message: string };

const PROMPTS: Record<AgentKind, (recent: MissionReceipt | undefined) => string | null> = {
  research: (r) =>
    r
      ? `Research follow-up. Given the prior deliverable:\n\n"""\n${quote(r)}\n"""\n\nReturn the 3 most leveraged questions to ask next, each with a one-line rationale and the kind of source that would answer it.`
      : null,
  builder: (r) =>
    r
      ? `Builder follow-up. Convert the prior deliverable into a concrete next step:\n\n"""\n${quote(r)}\n"""\n\nReturn: file paths to touch, exact functions, acceptance test, and rollback note.`
      : null,
  memory: (r) =>
    r
      ? `Memory follow-up. Distill the prior deliverable into a brain note:\n\n"""\n${quote(r)}\n"""\n\nReturn a single Markdown note (~120 words) suitable for storage in Brain Notes. Include 3 retrieval tags.`
      : null,
  repo: (r) =>
    r
      ? `Repo follow-up. Map the prior deliverable to repo changes:\n\n"""\n${quote(r)}\n"""\n\nReturn: which directories to touch, suggested branch name, and a 5-bullet PR description.`
      : null,
  marketing: (r) =>
    r
      ? `Marketing follow-up. Turn the prior deliverable into a one-paragraph public-facing summary suitable for an X post / Linear changelog / Substack note. Keep it honest. Avoid hype.\n\n"""\n${quote(r)}\n"""\n`
      : null
};

const MODES: Record<AgentKind, string> = {
  research: "general",
  builder: "dev",
  memory: "general",
  repo: "dev",
  marketing: "business"
};

/** Run one tick for one agent. Used by both the operator-tick button and the `/agent` console hook. */
export async function tickAgent(kind: AgentKind): Promise<AgentTickResult> {
  const setState = useAtlasStore.getState().setAgentState;
  const missions = useMissionStore.getState();

  setState(kind, "running");

  if (missions.current) {
    setState(kind, "blocked");
    return {
      ok: false,
      agent: kind,
      message: `another mission already in flight · agent waiting`
    };
  }

  const recent = missions.history[0];
  const builder = PROMPTS[kind];
  const brief = builder(recent);
  if (!brief) {
    setState(kind, "idle");
    return {
      ok: false,
      agent: kind,
      message: "no receipt to act on · dispatch a mission first"
    };
  }

  const receipt = await missions.dispatch(brief, MODES[kind], "fast", null);
  if (!receipt) {
    setState(kind, "blocked");
    return { ok: false, agent: kind, message: "dispatch failed" };
  }

  setState(kind, "done", receipt.id);
  return {
    ok: true,
    agent: kind,
    receiptId: receipt.id,
    message: `${kind} agent dispatched ${receipt.id} · ${receipt.deliverables.length} deliverables`
  };
}

/** Tick every agent that's in "running" or "waiting" state. */
export async function tickAllPending(): Promise<AgentTickResult[]> {
  const results: AgentTickResult[] = [];
  const agents = useAtlasStore.getState().agents;
  for (const a of agents) {
    if (a.state === "running" || a.state === "waiting") {
      results.push(await tickAgent(a.kind));
    }
  }
  return results;
}

export function setAgent(kind: AgentKind, state: AgentState) {
  useAtlasStore.getState().setAgentState(kind, state);
}

function quote(r: MissionReceipt): string {
  const first = r.deliverables[0];
  if (first) return first.content.replace(/\n+/g, "\n").slice(0, 300);
  return r.brief.slice(0, 300);
}

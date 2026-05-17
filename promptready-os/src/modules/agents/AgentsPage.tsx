"use client";

import { Bot, Sparkles, Wrench } from "lucide-react";
import { SurfaceHeader } from "@/components/primitives/SurfaceHeader";

/**
 * Agents surface · placeholder.
 *
 * The agent runtime (long-running operator tasks running on top of the
 * Mission Control pipeline) lands in a later phase. This screen names
 * the slot and the kinds of agents the system is intended to host. No
 * fake agents listed today.
 */

interface AgentSlot {
  name: string;
  blurb: string;
  status: "planned" | "in-progress";
}

const SLOTS: AgentSlot[] = [
  {
    name: "Inbox Triager",
    blurb: "Reads new email · tags by intent · drafts replies you approve.",
    status: "planned"
  },
  {
    name: "Repo Watchdog",
    blurb: "Watches a GitHub repo · flags PRs · summarises issues into the brain.",
    status: "planned"
  },
  {
    name: "Research Scout",
    blurb: "Runs a recurring search · clips into Brain Notes · emits weekly digest.",
    status: "planned"
  },
  {
    name: "Terminal Operator",
    blurb: "Wraps the local shell · runs vetted commands behind a confirmation.",
    status: "planned"
  }
];

export default function AgentsPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-5 py-5 md:px-7 md:py-7">
      <SurfaceHeader
        eyebrow="agents · operator runtime"
        title="Agents"
        sub="Long-running operator agents that work on your behalf between missions. None are wired today — the runtime ships after the mission pipeline."
        right={
          <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/55">
            0 active · runtime offline
          </span>
        }
      />

      <section className="rounded-2xl border border-dashed border-white/10 bg-white/[0.012] p-6 text-center">
        <Bot className="mx-auto h-6 w-6 text-white/35" />
        <p className="mt-2 text-[13px] text-white/75">No agents installed.</p>
        <p className="mt-1 text-[11px] text-white/45">
          The agent runtime arrives after Mission Control is fully wired
          end-to-end. The slots below describe the first agents we intend to
          ship — names only, no fake activity.
        </p>
      </section>

      <div>
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
          planned agents
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {SLOTS.map((s) => (
            <article
              key={s.name}
              className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-4"
            >
              <header className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                  <h2 className="text-[13px] font-semibold text-white">{s.name}</h2>
                </div>
                <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/50">
                  {s.status}
                </span>
              </header>
              <p className="text-[11.5px] text-white/55">{s.blurb}</p>
              <button
                type="button"
                disabled
                className="mt-1 inline-flex cursor-not-allowed items-center gap-1 self-start rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10.5px] font-medium text-white/45"
              >
                <Wrench className="h-3 w-3" /> Not installable yet
              </button>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

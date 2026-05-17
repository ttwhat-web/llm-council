"use client";

import { Archive, GitBranch, Layers } from "lucide-react";
import { SurfaceHeader } from "@/components/primitives/SurfaceHeader";

/**
 * Workflows surface · Mission Blueprints.
 *
 * Multi-step mission templates. Single missions live in Mission Control;
 * Workflows is for repeatable chains (run mission A → take output → feed
 * mission B). The runtime is planned, the blueprints below are honest
 * placeholders.
 */

const BLUEPRINTS = [
  {
    name: "PR Reviewer",
    steps: ["Fetch diff", "Classify changes", "Draft review", "Score risk"]
  },
  {
    name: "Inbox to Tasks",
    steps: ["Pull inbox", "Cluster by intent", "Draft tasks", "Score priority"]
  },
  {
    name: "Stack-trace Triage",
    steps: ["Parse trace", "Hypothesise cause", "Propose fix", "Emit safe command"]
  },
  {
    name: "Spec to Plan",
    steps: ["Read brief", "Architect", "File tree", "Risk register"]
  }
];

export default function WorkflowsPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-5 py-5 md:px-7 md:py-7">
      <SurfaceHeader
        eyebrow="workflows · mission blueprints"
        title="Workflows"
        sub="Chain multiple missions into a single repeatable run. The runtime ships after single-mission dispatch is live. Blueprints below are planned shapes, not running flows."
        right={
          <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/55">
            0 active · runtime offline
          </span>
        }
      />

      <section className="rounded-2xl border border-dashed border-white/10 bg-white/[0.012] p-6">
        <header className="flex items-center gap-2 pb-1">
          <Layers className="h-3.5 w-3.5 text-accent" />
          <span className="text-[13px] font-semibold text-white">No workflows installed</span>
        </header>
        <p className="text-[11.5px] text-white/55">
          A workflow is a chain of missions with passed-through context. The
          chain runtime arrives after Mission Control is wired end-to-end.
        </p>
      </section>

      <div>
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
          planned blueprints
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {BLUEPRINTS.map((b) => (
            <article
              key={b.name}
              className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-4"
            >
              <header className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-3.5 w-3.5 text-accent" />
                  <h2 className="text-[13px] font-semibold text-white">{b.name}</h2>
                </div>
                <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/50">
                  planned
                </span>
              </header>
              <ol className="flex flex-col gap-1 text-[11.5px] text-white/60">
                {b.steps.map((s, i) => (
                  <li key={s} className="flex items-center gap-2">
                    <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/35">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
              <button
                type="button"
                disabled
                className="mt-1 inline-flex cursor-not-allowed items-center gap-1 self-start rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10.5px] font-medium text-white/45"
              >
                <Archive className="h-3 w-3" /> Not runnable yet
              </button>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

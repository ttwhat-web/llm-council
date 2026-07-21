"use client";

import clsx from "clsx";
import { CopyButton } from "./CopyButton";
import type { ArchitectPlan, ArchitectResponse } from "@/lib/types";

/**
 * Renders the structured plan returned by /api/architect.
 * Sections: Architecture · Stack · File tree · Execution-ready prompt ·
 * Roadmap · Deployment checklist · Risks. Built on existing premium
 * glass + thin border styling — no new chrome system.
 */

export function ArchitectView({ data }: { data: ArchitectResponse }) {
  const p = data.plan;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 text-accent">
          Architect plan
        </span>
        <span className="rounded-md bg-white/5 px-2 py-0.5 text-white/65">
          via <span className="text-white/85">{data.resolved}</span>
          {data.model ? ` · ${data.model}` : ""}
        </span>
        {typeof data.latencyMs === "number" && (
          <span className="rounded-md bg-white/5 px-2 py-0.5 text-white/65">
            {data.latencyMs}ms
          </span>
        )}
        {data.isDeterministic && (
          <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-200">
            deterministic skeleton
          </span>
        )}
      </div>

      {data.notice && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
          {data.notice}
        </div>
      )}

      <Card title="Architecture">
        <p className="whitespace-pre-wrap text-[12px] leading-6 text-white/80">
          {p.architecture}
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <StackCard title="Frontend" items={p.stack.frontend} />
        <StackCard title="Backend" items={p.stack.backend} />
        <StackCard title="Infra" items={p.stack.infra} />
      </div>

      <Card title="File tree" copy={p.fileTree}>
        <pre className="scrollbar-thin max-h-[40vh] overflow-auto whitespace-pre rounded-lg bg-black/30 px-3 py-2 font-mono text-[11px] leading-5 text-white/85">
          {p.fileTree}
        </pre>
      </Card>

      <Card title="Execution-ready prompt" copy={p.prompt}>
        <pre className="scrollbar-thin max-h-[40vh] overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 px-3 py-2 font-mono text-[12px] leading-6 text-white/85">
          {p.prompt}
        </pre>
        <div className="mt-2 text-[10px] text-white/40">
          Paste into Claude / ChatGPT / Cursor to actually build this.
        </div>
      </Card>

      <Card title="Roadmap">
        <ol className="space-y-2 text-[12px] text-white/80">
          {p.roadmap.map((step, i) => (
            <li
              key={i}
              className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-white">{step.milestone}</span>
                <span className="font-mono text-[9px] uppercase tracking-wider text-white/35">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <ul className="mt-1 space-y-0.5">
                {step.deliverables.map((d, j) => (
                  <li key={j} className="text-[11px] text-white/65">
                    • {d}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </Card>

      <Card title="Deployment checklist">
        <ul className="space-y-1 text-[12px] text-white/80">
          {p.deploymentChecklist.map((c, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/70" />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Risks">
        <ul className="space-y-2">
          {p.risks.map((r, i) => {
            const tone = {
              low: "border-amber-500/20 bg-amber-500/[0.04] text-amber-200/85",
              medium: "border-amber-500/35 bg-amber-500/[0.08] text-amber-100",
              high: "border-red-500/30 bg-red-500/10 text-red-100"
            }[r.severity];
            return (
              <li key={i} className={clsx("rounded-lg border px-3 py-2 text-[12px]", tone)}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">{r.risk}</span>
                  <span className="font-mono text-[9px] uppercase tracking-wider opacity-80">
                    {r.severity}
                  </span>
                </div>
                <div className="mt-1 text-[11px] opacity-80">→ {r.mitigation}</div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

function Card({
  title,
  children,
  copy
}: {
  title: string;
  children: React.ReactNode;
  copy?: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02]">
      <header className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
          {title}
        </h3>
        {copy && <CopyButton text={copy} />}
      </header>
      <div className="px-3 py-3">{children}</div>
    </section>
  );
}

function StackCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card title={title}>
      {items.length === 0 ? (
        <span className="text-[11px] text-white/35">—</span>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <li
              key={i}
              className="rounded-md border border-white/8 bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] text-white/75"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export type { ArchitectPlan };

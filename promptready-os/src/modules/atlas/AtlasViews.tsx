"use client";

import clsx from "clsx";
import { Activity, Brain, Rocket, ShieldCheck } from "lucide-react";
import { useBrainStore } from "@/store/brain";
import { useMissionStore, STAGE_META, STAGES } from "@/store/mission";

/**
 * Operations + Live views for the Atlas home-mode toggle.
 *
 * Operations · what the operator is actively working on right now:
 *              current mission, attached repos, pinned terminal cards,
 *              recent receipts, pinned deliverables.
 *
 * Live       · mission stage stream + flight recorder for the current
 *              mission. Idle when no mission is in flight.
 */

export function OperationsView({ onOpenSection }: { onOpenSection: (id: string) => void }) {
  const current = useMissionStore((s) => s.current);
  const history = useMissionStore((s) => s.history);
  const sources = useBrainStore((s) => s.memorySources);

  const repos = sources.filter((s) => s.kind === "github");
  const recent = history.slice(0, 6);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card eyebrow="active mission" title={current ? "In flight" : "Idle"}>
        {current ? (
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[10.5px] uppercase tracking-wider text-accent">
              {current.id}
            </span>
            <span className="line-clamp-2 text-[11.5px] text-white/80">{current.brief.slice(0, 120)}</span>
            <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/45">
              stage: {current.stage}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onOpenSection("mission-system")}
            className="inline-flex items-center gap-1.5 self-start rounded-md bg-accent/85 px-2 py-1 text-[11.5px] font-semibold text-white shadow-glow hover:bg-accent"
          >
            <Rocket className="h-3 w-3" /> Dispatch one
          </button>
        )}
      </Card>

      <Card eyebrow="recent receipts" title={`${history.length} archived`}>
        {recent.length === 0 ? (
          <p className="text-[11px] text-white/55">Archive empty.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-[11px]">
            {recent.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-md border border-white/8 bg-white/[0.012] px-1.5 py-1"
              >
                <span className="truncate text-white/80">{m.brief.slice(0, 36)}</span>
                <span className="font-mono text-[9px] uppercase tracking-wider text-white/45">
                  {m.stage === "deliverable-ready" ? "ready" : m.stage}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card eyebrow="attached repos" title={`${repos.length} manual`}>
        {repos.length === 0 ? (
          <button
            type="button"
            onClick={() => onOpenSection("repo-layer")}
            className="inline-flex items-center gap-1.5 self-start rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[10.5px] uppercase tracking-wider text-white/75 hover:bg-white/[0.06]"
          >
            attach a repo →
          </button>
        ) : (
          <ul className="flex flex-col gap-1 text-[11px]">
            {repos.slice(0, 4).map((r) => (
              <li
                key={r.id}
                className="truncate rounded-md border border-white/8 bg-white/[0.012] px-1.5 py-1 font-mono text-white/80"
              >
                {r.label}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card eyebrow="brain shape" title="What's connected">
        <ul className="flex flex-col gap-1 text-[11px]">
          <li className="flex justify-between text-white/75">
            <span>sources</span>
            <span className="font-mono text-white">{sources.length}</span>
          </li>
          <li className="flex justify-between text-white/75">
            <span>repos</span>
            <span className="font-mono text-white">{repos.length}</span>
          </li>
          <li className="flex justify-between text-white/75">
            <span>missions archived</span>
            <span className="font-mono text-white">{history.length}</span>
          </li>
        </ul>
      </Card>

      <Card eyebrow="safety" title="Screen armed">
        <p className="flex items-start gap-1.5 text-[11px] text-white/60">
          <ShieldCheck className="mt-0.5 h-3 w-3 text-emerald-300/85" />
          Every destructive action shows a preview before it runs. Mobile companion (planned) will mirror approvals.
        </p>
      </Card>

      <Card eyebrow="atlas tip" title="One screen home">
        <p className="text-[11px] text-white/60">
          Switch to <span className="font-mono">Blueprint</span> for the full living map. <span className="font-mono">Live</span> shows the active mission's stages as they happen.
        </p>
      </Card>
    </div>
  );
}

export function LiveView() {
  const current = useMissionStore((s) => s.current);
  const history = useMissionStore((s) => s.history);
  const stageIdx = current ? STAGES.indexOf(current.stage) : 0;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
      <section className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.018] p-4 shadow-glass">
        <header className="flex items-center justify-between border-b border-white/5 pb-2">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
            live · execution graph
          </span>
          <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/55">
            {current ? `mission ${current.id}` : "no mission"}
          </span>
        </header>
        <ol className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
          {STAGES.filter((s) => s !== "idle").map((s, i) => {
            const idx = i + 1;
            const state = stageIdx > idx ? "done" : stageIdx === idx ? "current" : "pending";
            return (
              <li
                key={s}
                className={clsx(
                  "flex items-center justify-between rounded-md border px-2 py-1.5",
                  state === "current"
                    ? "border-accent/40 bg-accent/[0.08] shadow-glow"
                    : state === "done"
                      ? "border-emerald-400/25 bg-emerald-500/[0.04]"
                      : "border-white/8 bg-white/[0.012]"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={clsx(
                      "font-mono text-[9.5px] uppercase tracking-[0.2em]",
                      state === "current"
                        ? "text-accent"
                        : state === "done"
                          ? "text-emerald-300"
                          : "text-white/35"
                    )}
                  >
                    {STAGE_META[s].code}
                  </span>
                  <span className="text-[11.5px] text-white">{STAGE_META[s].label}</span>
                </div>
                <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/45">
                  {state}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.018] p-4">
        <header className="flex items-center justify-between border-b border-white/5 pb-2">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
            flight recorder
          </span>
        </header>
        <div className="rounded-md border border-white/8 bg-black/30 p-3">
          {current && current.events.length > 0 ? (
            <ul className="flex max-h-[260px] flex-col gap-1 overflow-auto font-mono text-[10.5px]">
              {current.events.map((e, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-white/30">{new Date(e.at).toLocaleTimeString()}</span>
                  <span className="uppercase tracking-wider text-white/55">{e.kind}</span>
                  <span className="rounded border border-white/10 bg-white/[0.03] px-1 py-px uppercase tracking-wider text-white/45">
                    {e.tag}
                  </span>
                  <span className="text-white/70">{e.message}</span>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="flex flex-col gap-1 font-mono text-[10.5px] text-white/55">
              <li className="flex items-center gap-2">
                <Brain className="h-3 w-3 text-accent" />
                <span>{history.length} mission{history.length === 1 ? "" : "s"} archived locally</span>
              </li>
              <li className="flex items-center gap-2">
                <Activity className="h-3 w-3 text-accent" />
                <span>No mission in flight · standby</span>
              </li>
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function Card({
  eyebrow,
  title,
  children
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <header className="flex flex-col gap-0.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-accent">
          {eyebrow}
        </span>
        <span className="text-[13px] font-semibold text-white">{title}</span>
      </header>
      {children}
    </article>
  );
}

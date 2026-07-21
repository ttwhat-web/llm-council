"use client";

/**
 * Company Brain panel · one grounded view of a person or company.
 *
 * Reachable from Cmd+K (and anywhere else that calls
 * useCompanyBrainPanelStore.open()) — never a new page. Recomputes the
 * brief reactively from the real stores every time it's open, exactly
 * like MemoryDistillationCard derives its suggestions; nothing is
 * cached or invented. Business language only: no source/store/model
 * wording ever reaches this screen.
 */

import { useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { useCompanyBrainPanelStore } from "@/store/companyBrainPanel";
import { useSourcesStore } from "@/store/sources";
import { useActionQueue } from "@/services/executors";
import { useOperatorMemoryStore } from "@/store/operatorMemory";
import { useMemoryCandidatesStore } from "@/store/memoryCandidates";
import { useMemoryNotesStore } from "@/store/memoryNotes";
import { useFeedbackStore } from "@/store/feedback";
import { getCompanyBrainResult } from "@/services/companyBrain/retrieve";
import type { CompanyBrainContext, CompanyBrainFact, CompanyBrainResult } from "@/services/companyBrain/types";

export function CompanyBrainPanel() {
  const query = useCompanyBrainPanelStore((s) => s.query);
  const open = useCompanyBrainPanelStore((s) => s.open);
  const close = useCompanyBrainPanelStore((s) => s.close);

  const snapshot = useSourcesStore((s) => s.snapshot);
  const actionItems = useActionQueue((s) => s.items);
  const actionLog = useActionQueue((s) => s.log);
  const memory = useOperatorMemoryStore((s) => s.memory);
  const candidates = useMemoryCandidatesStore((s) => s.candidates);
  const noteOverrides = useMemoryNotesStore((s) => s.overrides);
  const feedbackEvents = useFeedbackStore((s) => s.events);

  const ctx: CompanyBrainContext = useMemo(
    () => ({ snapshot, actionItems, actionLog, memory, candidates, noteOverrides, feedbackEvents, now: Date.now() }),
    [snapshot, actionItems, actionLog, memory, candidates, noteOverrides, feedbackEvents]
  );

  const result = useMemo(() => (query ? getCompanyBrainResult(query, ctx) : null), [query, ctx]);

  useEffect(() => {
    if (!query) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [query, close]);

  if (!query || !result) return null;

  return (
    <div className="fixed inset-0 z-[55] flex justify-end bg-black/40" onMouseDown={close}>
      <aside
        role="dialog"
        aria-label={`What Operator knows about ${query}`}
        className="flex h-full w-full max-w-[420px] flex-col overflow-y-auto border-l border-white/[0.08] bg-graphite-950/98 px-6 py-8 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ animation: "brain-slide-in 200ms ease-out" }}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-white/45 transition hover:bg-white/[0.06] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {"kind" in result ? <UnresolvedView kind={result.kind} candidates={"candidates" in result ? result.candidates : []} query={query} onPick={open} /> : <ResolvedView result={result} />}

        <style>{`@keyframes brain-slide-in { from { transform: translateX(16px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
      </aside>
    </div>
  );
}

function UnresolvedView({
  kind,
  candidates,
  query,
  onPick
}: {
  kind: "ambiguous" | "not-found";
  candidates: string[];
  query: string;
  onPick: (q: string) => void;
}) {
  if (kind === "ambiguous") {
    return (
      <div className="flex flex-col gap-3 pt-2">
        <p className="text-[15px] font-medium text-white">More than one match for &quot;{query}&quot;.</p>
        <ul className="flex flex-col gap-1.5">
          {candidates.map((name) => (
            <li key={name}>
              <button
                type="button"
                onClick={() => onPick(name)}
                className="w-full rounded-lg bg-white/[0.03] px-3 py-2 text-left text-[13.5px] text-white/85 transition hover:bg-white/[0.06]"
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 pt-2">
      <p className="text-[15px] font-medium text-white">Nothing yet on &quot;{query}&quot;.</p>
      <p className="text-[13px] leading-relaxed text-white/55">
        No email, calendar, or memory mentions this — once there is, it'll show up here.
      </p>
    </div>
  );
}

function ResolvedView({ result }: { result: CompanyBrainResult }) {
  return (
    <div className="flex flex-col gap-6 pt-2">
      <header className="flex flex-col gap-1">
        <h2 className="text-[19px] font-semibold tracking-tight text-white">{result.displayName}</h2>
        <p className="text-[13px] text-white/55">{result.who}</p>
      </header>

      {!result.hasEvidence && (
        <p className="text-[13px] leading-relaxed text-white/55">No real activity yet — nothing to summarize.</p>
      )}

      {result.recommendation && (
        <Section label="Recommendation">
          <p className="text-[14px] leading-relaxed text-white">{result.recommendation.text}</p>
          <FactList facts={result.recommendation.evidence} muted />
        </Section>
      )}

      {result.pending.length > 0 && (
        <Section label="Pending">
          <FactList facts={result.pending} />
        </Section>
      )}

      {result.attention.length > 0 && (
        <Section label="Needs attention" tone="amber">
          <FactList facts={result.attention} />
        </Section>
      )}

      {result.memory.length > 0 && (
        <Section label="Memory">
          <FactList facts={result.memory} />
        </Section>
      )}

      {result.conflicts.length > 0 && (
        <Section label="Worth checking" tone="amber">
          {result.conflicts.map((c, i) => (
            <p key={i} className="text-[12.5px] leading-relaxed text-amber-200/85">
              {c.note}
            </p>
          ))}
        </Section>
      )}

      {result.recentDecisions.length > 0 && (
        <Section label="Recent">
          <FactList facts={result.recentDecisions} />
        </Section>
      )}
    </div>
  );
}

function Section({ label, tone, children }: { label: string; tone?: "amber"; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <span
        className={
          tone === "amber"
            ? "text-[10.5px] font-semibold uppercase tracking-[0.15em] text-amber-300/70"
            : "text-[10.5px] font-semibold uppercase tracking-[0.15em] text-white/35"
        }
      >
        {label}
      </span>
      {children}
    </section>
  );
}

function FactList({ facts, muted }: { facts: CompanyBrainFact[]; muted?: boolean }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {facts.map((f, i) => (
        <li key={i} className={muted ? "text-[12px] text-white/45" : "text-[13.5px] leading-relaxed text-white/80"}>
          {f.text}
        </li>
      ))}
    </ul>
  );
}

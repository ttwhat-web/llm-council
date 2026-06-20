"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import clsx from "clsx";
import { ArrowRight, CornerDownLeft, Loader, X } from "lucide-react";
import { useBrainStore } from "@/store/brain";
import {
  useMissionStore,
  STAGES,
  STAGE_META,
  type MissionStage
} from "@/store/mission";

/**
 * Home · the executive briefing surface.
 *
 * Three layers, in this order, top to bottom:
 *   50% · Executive briefing  → "what deserves your attention right now"
 *   30% · Workspace context   → situational awareness of customers /
 *                                opportunities / risks / active work
 *   20% · Ask Operator        → composer, always visible, never dominant
 *
 * Honest by default: no real sources are connected on day one, so the
 * briefing and workspace render empty states that tell the user what
 * to do *today* (connect a source). A `?demo=1` query param flips the
 * page to a populated example for screenshots and customer demos —
 * never used in real-data render paths.
 */

type Priority = "high" | "medium" | "low";

interface BriefingItem {
  id: string;
  priority: Priority;
  title: string;
  detail: string;
  actions: Array<{ label: string; href?: string; onClick?: () => void }>;
}

interface ContextRow {
  id: string;
  text: string;
  action?: { label: string; href: string };
}

interface ContextGroup {
  id: string;
  title: string;
  rows: ContextRow[];
}

function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 5) return "Up late";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// Demo data — only rendered when ?demo=1. Never fabricated outside
// that flag. Lives at module scope so the populated example renders
// without invoking any of the day-one empty-state paths.
const DEMO_BRIEFING: BriefingItem[] = [
  {
    id: "leads",
    priority: "high",
    title: "Three warm leads have gone cold",
    detail:
      "Acme, Bridge & Co., and Delta GmbH all showed buying intent last week. None have been contacted in five days. After seven days the lift drops sharply.",
    actions: [
      { label: "Draft three follow-ups" },
      { label: "Show me who" }
    ]
  },
  {
    id: "offers",
    priority: "high",
    title: "€18,400 is stuck on payment links",
    detail:
      "Two offers were approved on Tuesday but no Stripe links have gone out. The customers are waiting on a one-click step.",
    actions: [
      { label: "Generate the links" },
      { label: "Open the offers" }
    ]
  },
  {
    id: "vip",
    priority: "medium",
    title: "VIP customer waiting on a reply",
    detail:
      "A VIP refund request from yesterday morning still has no response, 18 hours later. This account has high repeat potential.",
    actions: [
      { label: "Draft a reply" },
      { label: "Open the conversation" }
    ]
  },
  {
    id: "btc",
    priority: "low",
    title: "BTC moved +4.2% — your watch rule fired",
    detail:
      "The 4.2% move happened at 03:14 UTC on the ETF approval news. You asked to be told about ±3% moves.",
    actions: [{ label: "Open Markets", href: "/markets?symbol=BTC" }]
  }
];

const DEMO_CONTEXT: ContextGroup[] = [
  {
    id: "customers",
    title: "Customers needing follow-up",
    rows: [
      { id: "acme", text: "Acme · warm lead, 7 days cold", action: { label: "Draft note", href: "#" } },
      { id: "bridge", text: "Bridge & Co. · buying signal, 5d stale", action: { label: "Draft note", href: "#" } },
      { id: "delta", text: "Delta GmbH · pricing question, 4d", action: { label: "Draft note", href: "#" } }
    ]
  },
  {
    id: "opportunities",
    title: "Opportunities worth a push",
    rows: [
      { id: "acme-2", text: "Acme · viewed pricing 4× this week", action: { label: "Open", href: "#" } },
      { id: "helios", text: "Helios Studio · opened 3 emails, replied once", action: { label: "Open", href: "#" } }
    ]
  },
  {
    id: "risks",
    title: "Risks to address",
    rows: [
      { id: "bridge-2", text: "Bridge & Co. · no contact in 21 days, was monthly", action: { label: "Reach out", href: "#" } },
      { id: "vector", text: "Vector Labs · refund mentioned in last reply", action: { label: "Open", href: "#" } }
    ]
  },
  {
    id: "work",
    title: "Active work",
    rows: [
      { id: "investor", text: "Investor update draft in progress", action: { label: "Continue", href: "/console" } },
      { id: "proposal", text: "Acme proposal · waiting on their reply", action: { label: "Open", href: "/library" } }
    ]
  }
];

export default function HomePage() {
  const identity = useBrainStore((s) => s.identity);
  const [now, setNow] = useState(() => new Date());
  const [searchParams] = useSearchParams();
  const isDemo = searchParams.get("demo") === "1";

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const firstName = identity?.name?.split(/\s+/)[0] ?? "Operator";
  const greeting = greetingFor(now);
  const briefing: BriefingItem[] = isDemo ? DEMO_BRIEFING : [];
  const contextGroups: ContextGroup[] = isDemo ? DEMO_CONTEXT : [];

  const summary = isDemo
    ? `${briefing.length} things need your attention today.`
    : "Operator is ready. Nothing is being watched yet — connect a source so tomorrow's briefing has real items.";

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-10 px-8 py-12">
      <header className="flex flex-col gap-3">
        <h1 className="text-[32px] font-semibold leading-tight tracking-tight text-white">
          {greeting}, {firstName}.
        </h1>
        <p className="max-w-2xl text-[15px] leading-relaxed text-white/65">{summary}</p>
      </header>

      {/* 50% · Executive briefing */}
      <section aria-label="Executive briefing" className="flex flex-col">
        {briefing.length === 0 ? (
          <EmptyBriefing />
        ) : (
          <ol className="flex flex-col">
            {briefing.map((item, i) => (
              <BriefingRow key={item.id} item={item} first={i === 0} />
            ))}
          </ol>
        )}
      </section>

      {/* 30% · Workspace context */}
      <section aria-label="Workspace" className="flex flex-col gap-4">
        <h2 className="text-[13px] font-medium text-white/45">Workspace</h2>
        {contextGroups.length === 0 ? (
          <EmptyWorkspace />
        ) : (
          <div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
            {contextGroups.map((g) => (
              <ContextSection key={g.id} group={g} />
            ))}
          </div>
        )}
      </section>

      {/* 20% · Ask Operator */}
      <section aria-label="Ask Operator" className="flex flex-col gap-3">
        <Composer />
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Briefing
// ---------------------------------------------------------------------------

function BriefingRow({ item, first }: { item: BriefingItem; first: boolean }) {
  return (
    <li
      className={clsx(
        "grid grid-cols-[88px_minmax(0,1fr)] items-start gap-4 py-5",
        !first && "border-t border-white/[0.04]"
      )}
    >
      <PriorityLabel priority={item.priority} />
      <div className="flex min-w-0 flex-col gap-2">
        <h3 className="text-[16px] font-medium leading-snug text-white">{item.title}</h3>
        <p className="text-[14px] leading-relaxed text-white/65">{item.detail}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
          {item.actions.map((a) =>
            a.href ? (
              <Link
                key={a.label}
                to={a.href}
                className="text-[13px] text-white/85 transition hover:text-white"
              >
                ▸ {a.label}
              </Link>
            ) : (
              <button
                key={a.label}
                type="button"
                onClick={a.onClick}
                className="text-[13px] text-white/85 transition hover:text-white"
              >
                ▸ {a.label}
              </button>
            )
          )}
          <span className="ml-auto flex items-center gap-3 text-[12px] text-white/35">
            <button type="button" className="transition hover:text-white/65">
              snooze
            </button>
            <button type="button" className="transition hover:text-white/65">
              dismiss
            </button>
          </span>
        </div>
      </div>
    </li>
  );
}

function PriorityLabel({ priority }: { priority: Priority }) {
  const tone =
    priority === "high"
      ? "text-rose-300"
      : priority === "medium"
        ? "text-amber-300"
        : "text-white/40";
  const label = priority === "high" ? "HIGH" : priority === "medium" ? "MED" : "LOW";
  return <span className={clsx("pt-[2px] text-[11px] font-semibold tracking-wider", tone)}>{label}</span>;
}

function EmptyBriefing() {
  return (
    <div className="flex flex-col gap-3 py-2">
      <p className="text-[14.5px] leading-relaxed text-white/65">
        When sources are watching, attention items appear here — three sentences each: what happened, why it matters, what to do.
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-[13px]">
        <Link to="/settings" className="text-white/85 transition hover:text-white">
          ▸ Connect email
        </Link>
        <Link to="/settings" className="text-white/85 transition hover:text-white">
          ▸ Connect calendar
        </Link>
        <Link to="/markets" className="text-white/85 transition hover:text-white">
          ▸ Set up market watch rules
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Workspace context
// ---------------------------------------------------------------------------

function ContextSection({ group }: { group: ContextGroup }) {
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <h3 className="text-[13px] font-medium text-white/55">{group.title}</h3>
      <ul className="flex flex-col">
        {group.rows.map((r, i) => (
          <li
            key={r.id}
            className={clsx(
              "flex min-w-0 items-center justify-between gap-3 py-2",
              i > 0 && "border-t border-white/[0.03]"
            )}
          >
            <span className="min-w-0 truncate text-[13.5px] text-white/85">{r.text}</span>
            {r.action && (
              <Link
                to={r.action.href}
                className="shrink-0 text-[12.5px] text-white/55 transition hover:text-white"
              >
                ▸ {r.action.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function EmptyWorkspace() {
  return (
    <p className="max-w-xl text-[14px] leading-relaxed text-white/55">
      Once Operator is watching, this is where you&apos;ll see customers needing follow-up, opportunities you can close, risks to address, and work in progress.
    </p>
  );
}

// ---------------------------------------------------------------------------
// Composer
// ---------------------------------------------------------------------------

function Composer() {
  const [brief, setBrief] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const navigate = useNavigate();
  const current = useMissionStore((s) => s.current);
  const dispatch = useMissionStore((s) => s.dispatch);
  const cancel = useMissionStore((s) => s.cancel);

  const inFlight =
    !!current && current.stage !== "idle" && current.stage !== "deliverable-ready";
  const justFinished = !!current && current.stage === "deliverable-ready";

  useEffect(() => {
    const t = textareaRef.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = `${Math.min(t.scrollHeight, 220)}px`;
  }, [brief]);

  const onDispatch = useCallback(() => {
    const trimmed = brief.trim();
    if (!trimmed || inFlight) return;
    void dispatch(trimmed, "auto", "fast", null);
    setBrief("");
  }, [brief, dispatch, inFlight]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onDispatch();
    }
  };

  return (
    <>
      <div
        className={clsx(
          "rounded-2xl bg-white/[0.03] p-3 transition",
          "focus-within:bg-white/[0.045] focus-within:shadow-[0_0_0_1px_rgba(124,155,255,0.18),0_18px_48px_-24px_rgba(124,155,255,0.35)]"
        )}
      >
        <textarea
          ref={textareaRef}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask Operator…"
          rows={2}
          aria-label="Ask Operator"
          className="min-h-[56px] w-full resize-none bg-transparent text-[15px] leading-relaxed text-white placeholder:text-white/35 focus:outline-none"
        />
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[11.5px] text-white/35">
            Try · What should I focus on today? · Draft follow-ups · Who is at risk?
          </span>
          <span className="ml-auto flex items-center gap-2">
            {inFlight && (
              <button
                type="button"
                onClick={cancel}
                className="inline-flex items-center gap-1 text-[12px] text-white/55 transition hover:text-white"
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
            )}
            <button
              type="button"
              onClick={onDispatch}
              disabled={!brief.trim() || inFlight}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-[12.5px] font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/45"
            >
              {inFlight ? (
                <>
                  <Loader className="h-3.5 w-3.5 animate-spin" /> Working…
                </>
              ) : (
                <>
                  Send
                  <span className="hidden items-center gap-0.5 text-[10.5px] font-normal text-black/50 sm:inline-flex">
                    <CornerDownLeft className="h-3 w-3" /> ⌘
                  </span>
                </>
              )}
            </button>
          </span>
        </div>
      </div>

      {inFlight && current && <InlineTrace stage={current.stage} />}

      {justFinished && current && (
        <div className="flex items-center gap-3 pt-1">
          <span className="text-[13px] text-white/70">
            Done · {current.deliverables.length} deliverable
            {current.deliverables.length === 1 ? "" : "s"} ready.
          </span>
          <button
            type="button"
            onClick={() => navigate("/console")}
            className="ml-auto inline-flex items-center gap-1 text-[13px] text-white/85 transition hover:text-white"
          >
            Open in Console <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </>
  );
}

function InlineTrace({ stage }: { stage: MissionStage }) {
  const idx = STAGES.indexOf(stage);
  return (
    <ol className="flex flex-col pt-1">
      {STAGES.filter((s) => s !== "idle").map((s, i) => {
        const reached = STAGES.indexOf(s) <= idx;
        const active = s === stage;
        return (
          <li
            key={s}
            className={clsx(
              "flex items-center gap-3 py-1 text-[12.5px]",
              reached ? "text-white/80" : "text-white/30"
            )}
          >
            <span
              className={clsx(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px]",
                active
                  ? "bg-accent text-black"
                  : reached
                    ? "bg-emerald-400/15 text-emerald-300"
                    : "bg-white/[0.05] text-white/35"
              )}
            >
              {reached && !active ? "✓" : i + 1}
            </span>
            <span>{STAGE_META[s].label}</span>
          </li>
        );
      })}
    </ol>
  );
}

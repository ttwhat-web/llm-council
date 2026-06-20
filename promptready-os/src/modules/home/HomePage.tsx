"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
 * Home · Operator Center morning canvas.
 *
 * Layout law:
 *   40 %  Executive briefing       Operator speaks · explains
 *   40 %  Workspace context        the receipts · proves
 *   20 %  Ask Operator             the action · acts
 *
 * Zoom model (Phase B): a click on a briefing verb or a panel header
 * sets `?focus=<topic>` in the URL and slides a focus column in from
 * the right. The morning canvas dims to 60 %; the focus column shows
 * the rows behind the briefing claim. Esc or the close link returns
 * focus to the morning. The URL holds the state, so the zoom is
 * deep-linkable.
 *
 * Honesty: no mock automation. Focus columns expose the data behind
 * a recommendation but do not fake a send / draft / link / payment.
 * Each focus column ends with a single honest line that names the
 * source required to convert the recommendation into an action.
 *
 * Demo gate: `?demo=1` renders a populated example with travel-agent
 * sample data so the layout can be screenshotted and felt without
 * inventing data in the default render path.
 */

type FocusKey = "customers" | "revenue" | "tasks" | "lines";

const FOCUS_KEYS: FocusKey[] = ["customers", "revenue", "tasks", "lines"];

function isFocusKey(v: string | null): v is FocusKey {
  return !!v && (FOCUS_KEYS as string[]).includes(v);
}

function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 5) return "Up late";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// ---------------------------------------------------------------------------
// Demo data — only used when ?demo=1
// ---------------------------------------------------------------------------

interface BriefingItem {
  id: string;
  body: string;
  focus: FocusKey;
  verb: string;
}

interface PanelRow {
  id: string;
  primary: string;
  secondary: string;
  trailing?: string;
}

interface PanelData {
  label: string;
  count: string;
  rows: PanelRow[];
  rightRowsHeader?: string;
}

const DEMO_BRIEFING: BriefingItem[] = [
  {
    id: "customers",
    body: "Ahmet Serdar grubundan dönüş bekleyen dört müşteri var. Almanca konuşan grup, ilk teklif altı gün önce gitti. Geçen yıl bu grubun %72'si haftanın içinde rezervasyon yaptı.",
    focus: "customers",
    verb: "Müşterileri aç"
  },
  {
    id: "revenue",
    body: "18.400 € yedi teklifte bekliyor. Hepsi onaylı; sadece ödeme linki gönderilmemiş. Bridge & Co. ve Müller iki büyük olanlar.",
    focus: "revenue",
    verb: "Teklifleri aç"
  },
  {
    id: "lines",
    body: "Almanya hattında düşüş var. Son 14 günde rezervasyon %18 düştü; aynı dönemde İstanbul–Antalya %4 arttı. Bir tek hatta has bir şey.",
    focus: "lines",
    verb: "Hattı aç"
  }
];

const DEMO_PANELS: Record<FocusKey, PanelData> = {
  customers: {
    label: "Customers",
    count: "4 waiting",
    rows: [
      { id: "muller", primary: "Hans Müller", secondary: "Almanca · 6 kişi", trailing: "6d" },
      { id: "schmidt", primary: "Peter Schmidt", secondary: "Almanca · single", trailing: "5d" },
      { id: "smith", primary: "John Smith", secondary: "İngilizce · aile", trailing: "4d" },
      { id: "klein", primary: "Anna Klein", secondary: "Almanca · özel istek", trailing: "3d" }
    ]
  },
  revenue: {
    label: "Revenue",
    count: "18.400 € pending",
    rows: [
      { id: "bridge", primary: "Bridge & Co. proposal", secondary: "Approved 8d ago", trailing: "8.400 €" },
      { id: "muller-r", primary: "Müller group offer", secondary: "Approved 5d ago", trailing: "4.200 €" },
      { id: "schmidt-r", primary: "Schmidt single", secondary: "Approved 4d ago", trailing: "2.100 €" },
      { id: "klein-r", primary: "Klein add-on", secondary: "Approved 3d ago", trailing: "1.800 €" },
      { id: "smith-r", primary: "Smith family", secondary: "Approved 6d ago", trailing: "1.300 €" },
      { id: "yildiz", primary: "Yıldız tour", secondary: "Approved 2d ago", trailing: "400 €" },
      { id: "demir", primary: "Demir family", secondary: "Approved today", trailing: "200 €" }
    ]
  },
  tasks: {
    label: "Tasks",
    count: "5 open",
    rows: [
      { id: "draft", primary: "Draft follow-ups", secondary: "4 customers · ~2 min" },
      { id: "links", primary: "Generate payment links", secondary: "7 offers · ~1 min" },
      { id: "bridge-c", primary: "Send Bridge contract", secondary: "~15 min" },
      { id: "itinerary", primary: "Update Schmidt itinerary", secondary: "~10 min" },
      { id: "refund", primary: "Review Klein refund", secondary: "~5 min" }
    ]
  },
  lines: {
    label: "Lines",
    count: "last 14d",
    rows: [
      { id: "de", primary: "Germany", secondary: "28 → 23 rezervasyon", trailing: "▼ 18 %" },
      { id: "ru", primary: "Russia", secondary: "sessiz hat", trailing: "▼  4 %" },
      { id: "ist-ayt", primary: "Local · IST → AYT", secondary: "düzenli artış", trailing: "▲  4 %" },
      { id: "uk", primary: "United Kingdom", secondary: "stabil", trailing: "= 0 %" }
    ]
  }
};

// Source that would need to be connected to turn each focus into a
// real action. Used in the focus column's honesty footer.
const FOCUS_SOURCE: Record<FocusKey, string> = {
  customers: "Gmail or a customer source",
  revenue: "Stripe or a payment provider",
  tasks: "Calendar or a task source",
  lines: "Stripe / Shopify or a CSV import"
};

const FOCUS_DAY1_BLURB: Record<FocusKey, string> = {
  customers:
    "Once Operator can read your inbox, customers waiting on a reply will land here, ranked by how long they've waited and how warm they were.",
  revenue:
    "Once Operator can see your offers and payments, open offers will land here with the amount, the customer, and the next step.",
  tasks:
    "Once a calendar or task source is connected, today's work will land here, sorted by what unblocks the most.",
  lines:
    "Once Operator can see your sales lines (markets, channels, regions, products), shifts will land here with the reason where we can find one."
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  const identity = useBrainStore((s) => s.identity);
  const [now, setNow] = useState(() => new Date());
  const [searchParams, setSearchParams] = useSearchParams();
  const isDemo = searchParams.get("demo") === "1";
  const focusParam = searchParams.get("focus");
  const focus: FocusKey | null = isFocusKey(focusParam) ? focusParam : null;

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const openFocus = useCallback(
    (key: FocusKey) => {
      const next = new URLSearchParams(searchParams);
      next.set("focus", key);
      setSearchParams(next, { replace: false });
    },
    [searchParams, setSearchParams]
  );

  const closeFocus = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete("focus");
    setSearchParams(next, { replace: false });
  }, [searchParams, setSearchParams]);

  // Esc closes the focus column.
  useEffect(() => {
    if (!focus) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeFocus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focus, closeFocus]);

  const firstName = identity?.name?.split(/\s+/)[0] ?? "Operator";
  const greeting = greetingFor(now);

  const briefing: BriefingItem[] = isDemo ? DEMO_BRIEFING : [];
  const panels = isDemo ? DEMO_PANELS : null;

  return (
    <div className="flex h-full min-h-0">
      <main
        className={clsx(
          "flex min-h-0 flex-1 flex-col overflow-y-auto transition-opacity duration-200",
          focus && "opacity-60"
        )}
      >
        <div
          className={clsx(
            "mx-auto flex w-full max-w-[820px] flex-col gap-10 px-8 py-12",
            focus && "pointer-events-none"
          )}
          aria-hidden={focus ? true : undefined}
        >
          {/* Greeting */}
          <header className="flex flex-col gap-3">
            <h1 className="text-[32px] font-semibold leading-tight tracking-tight text-white">
              {greeting}, {firstName}.
            </h1>
            <p className="max-w-2xl text-[15px] leading-relaxed text-white/65">
              {isDemo
                ? "Bu sabah üç şeye dikkat etmen gerek. Aşağıdaki paneller neyi temel aldığımı gösteriyor."
                : "Henüz hiçbir kaynağa bağlı değilim, o yüzden bu sabah sana güvenebileceğin bir özet veremem. Bir tane bağlayalım — yarın gerçek bir özetle başlarız."}
            </p>
          </header>

          {/* 40 % · Briefing */}
          <section aria-label="Executive briefing" className="flex flex-col gap-6">
            {briefing.length === 0 ? (
              <EmptyBriefing />
            ) : (
              briefing.map((item) => (
                <BriefingRow key={item.id} item={item} onOpen={() => openFocus(item.focus)} />
              ))
            )}
          </section>

          {/* 40 % · Workspace context */}
          <section aria-label="Workspace" className="grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-2">
            {(FOCUS_KEYS as FocusKey[]).map((k) => (
              <PanelView
                key={k}
                focus={k}
                data={panels?.[k] ?? null}
                onOpen={() => openFocus(k)}
              />
            ))}
          </section>

          {/* 20 % · Ask Operator */}
          <section aria-label="Ask Operator" className="flex flex-col gap-3">
            <Composer />
          </section>
        </div>
      </main>

      {focus && (
        <FocusColumn focus={focus} onClose={closeFocus} isDemo={isDemo} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Briefing
// ---------------------------------------------------------------------------

function BriefingRow({ item, onOpen }: { item: BriefingItem; onOpen: () => void }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-[15.5px] leading-relaxed text-white/90">
        <span aria-hidden className="mr-2 text-white/35">●</span>
        {item.body}
      </p>
      <button
        type="button"
        onClick={onOpen}
        className="self-start text-[13.5px] text-white/75 transition hover:text-white"
      >
        ▸ {item.verb}
      </button>
    </div>
  );
}

function EmptyBriefing() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[15px] leading-relaxed text-white/80">
        <span aria-hidden className="mr-2 text-white/35">●</span>
        Gmail&apos;i bağla — gelen kutusundan müşteri ve ödeme sinyallerini ben çıkarırım. Yarın bu satırda gerçek bir özet olur.
      </p>
      <Link to="/settings" className="self-start text-[13.5px] text-white/75 transition hover:text-white">
        ▸ Connect Gmail · ~30 saniye
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Workspace panels
// ---------------------------------------------------------------------------

function PanelView({
  focus,
  data,
  onOpen
}: {
  focus: FocusKey;
  data: PanelData | null;
  onOpen: () => void;
}) {
  // Always-visible name even on empty state. Count + rows only when
  // populated.
  const label = data?.label ?? defaultLabel(focus);
  const count = data?.count;

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <button
        type="button"
        onClick={onOpen}
        className="flex items-baseline justify-between gap-3 text-left"
      >
        <h2 className="text-[13px] font-medium tracking-wide text-white/85">{label}</h2>
        <span className="text-[11.5px] text-white/40">
          {count ?? "needs setup"}
          <ArrowRight className="ml-1 inline h-3 w-3 -translate-y-px text-white/30" />
        </span>
      </button>
      {data ? (
        <ul className="flex flex-col">
          {data.rows.slice(0, 4).map((r, i) => (
            <li
              key={r.id}
              className={clsx(
                "flex min-w-0 items-baseline justify-between gap-3 py-1.5",
                i > 0 && "border-t border-white/[0.03]"
              )}
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[13.5px] text-white/85">{r.primary}</span>
                <span className="truncate text-[11.5px] text-white/45">{r.secondary}</span>
              </span>
              {r.trailing && (
                <span className="shrink-0 text-[12.5px] tabular-nums text-white/65">{r.trailing}</span>
              )}
            </li>
          ))}
          {data.rows.length > 4 && (
            <li className="pt-1.5 text-[11.5px] text-white/40">
              + {data.rows.length - 4} more
            </li>
          )}
        </ul>
      ) : (
        <p className="text-[12.5px] leading-relaxed text-white/45">
          {FOCUS_DAY1_BLURB[focus].split(". ")[0]}.
        </p>
      )}
    </section>
  );
}

function defaultLabel(focus: FocusKey): string {
  switch (focus) {
    case "customers":
      return "Customers";
    case "revenue":
      return "Revenue";
    case "tasks":
      return "Tasks";
    case "lines":
      return "Lines";
  }
}

// ---------------------------------------------------------------------------
// Focus column · Phase B zoom shell
// ---------------------------------------------------------------------------

function FocusColumn({
  focus,
  onClose,
  isDemo
}: {
  focus: FocusKey;
  onClose: () => void;
  isDemo: boolean;
}) {
  const data = isDemo ? DEMO_PANELS[focus] : null;

  return (
    <aside
      role="complementary"
      aria-label={`${defaultLabel(focus)} detail`}
      className="flex w-full max-w-[520px] shrink-0 flex-col overflow-y-auto border-l border-white/[0.06] bg-white/[0.008]"
      style={{ animation: "focus-slide-in 220ms ease-out" }}
    >
      <header className="flex items-center justify-between gap-3 px-6 pb-1 pt-12">
        <h2 className="text-[20px] font-semibold tracking-tight text-white">
          {data?.label ?? defaultLabel(focus)}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close detail"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/45 transition hover:bg-white/[0.04] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {data ? (
        <div className="flex flex-col gap-1 px-6 pb-6">
          <p className="pb-4 text-[13px] text-white/55">{data.count}</p>
          <ul className="flex flex-col">
            {data.rows.map((r, i) => (
              <li
                key={r.id}
                className={clsx(
                  "flex min-w-0 items-baseline justify-between gap-4 py-3",
                  i > 0 && "border-t border-white/[0.04]"
                )}
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-[14.5px] text-white/90">{r.primary}</span>
                  <span className="truncate text-[12.5px] text-white/50">{r.secondary}</span>
                </span>
                {r.trailing && (
                  <span className="shrink-0 text-[13px] tabular-nums text-white/75">{r.trailing}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="px-6 pb-6">
          <p className="text-[13.5px] leading-relaxed text-white/65">{FOCUS_DAY1_BLURB[focus]}</p>
        </div>
      )}

      {/* Honesty footer · no faked actions */}
      <footer className="mt-auto flex flex-col gap-3 border-t border-white/[0.04] px-6 py-5">
        <p className="text-[12.5px] leading-relaxed text-white/50">
          Acting on this list (drafting, sending, generating links) requires {FOCUS_SOURCE[focus]}. Operator won&apos;t fake an action until the source is connected.
        </p>
        <Link
          to="/settings"
          className="self-start text-[13px] text-white/85 transition hover:text-white"
        >
          ▸ Open Settings
        </Link>
      </footer>

      <style>{`@keyframes focus-slide-in { from { transform: translateX(12px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Composer · 20 %
// ---------------------------------------------------------------------------

function Composer() {
  const [brief, setBrief] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const navigate = useNavigate();
  const current = useMissionStore((s) => s.current);
  const dispatch = useMissionStore((s) => s.dispatch);
  const cancel = useMissionStore((s) => s.cancel);

  const inFlight = !!current && current.stage !== "idle" && current.stage !== "deliverable-ready";
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
          placeholder="Talk to me."
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

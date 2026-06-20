"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import clsx from "clsx";
import { ArrowRight, CornerDownLeft, ExternalLink, Loader, RefreshCw, X } from "lucide-react";
import {
  useMissionStore,
  STAGES,
  STAGE_META,
  type MissionStage
} from "@/store/mission";
import { useSourcesStore } from "@/store/sources";
import type { BriefingItem as RealBriefingItem } from "@/services/briefing/types";
import type { PanelData as RealPanelData } from "@/services/briefing/engine";

/**
 * Home · Operator Center morning briefing.
 *
 * Layout law (40 / 40 / 20):
 *   40 %  Executive briefing       Operator decides — FACT · WHY · RECOMMENDATION
 *   40 %  Workspace context        decision support — each panel opens with an
 *                                  Operator opinion line; rows below are receipts
 *   20 %  Ask Operator             composer · never dominant
 *
 * Zoom shell (Phase B):
 *   ?focus=<key> slides a right column that renders the COO mini-report
 *   for that area (THE PATTERN · WHY IT MATTERS · THE MOVE), followed
 *   by the raw rows as quiet receipts at the bottom. Esc or X closes.
 *
 * Honesty: no mock automation. Focus columns end with one line naming
 * the source required to convert the recommendation into an action.
 *
 * Demo gate: ?demo=1 renders a populated example with travel-agent
 * sample data. Never used outside that flag.
 */

type FocusKey = "customers" | "revenue" | "tasks" | "calendar";

const FOCUS_KEYS: FocusKey[] = ["customers", "revenue", "tasks", "calendar"];

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

// User first name — read from localStorage. Demo mode overrides to
// "Tunç" so the populated example matches the reference design. If
// no name is stored the greeting omits the name rather than greeting
// the AI ("Atlas" was wrong — that's the brain identity, not the
// user).
function getUserFirstName(isDemo: boolean): string | null {
  if (isDemo) return "Tunç";
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem("operator.user.firstName");
    return stored && stored.trim() ? stored.trim() : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Data shape
// ---------------------------------------------------------------------------

interface BriefingItem {
  id: string;
  focus: FocusKey;
  fact: string;
  why: string;
  recommendation: string;
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
  // The Operator's opinion line, rendered under the panel title.
  // This is what makes the panel "decision support" instead of CRM.
  headline: string;
  rows: PanelRow[];
  // COO mini-report content, used in the focus column.
  pattern: string;
  why: string[];
  move: string[];
}

// ---------------------------------------------------------------------------
// Demo data (?demo=1 only)
// ---------------------------------------------------------------------------

const DEMO_BRIEFING: BriefingItem[] = [
  {
    id: "customers",
    focus: "customers",
    fact: "Ahmet Serdar grubundan dönüş bekleyen dört müşteri var. İlk teklif altı gün önce gitti.",
    why: "Bu profilin %72'si ilk hafta içinde rezervasyon yaptı; 7. günden sonra oran belirgin düşüyor.",
    recommendation:
      "Bugün hepsine kısa bir takip yaz. Almanca grubuna Almanca, Smith'e İngilizce.",
    verb: "Müşterileri aç"
  },
  {
    id: "revenue",
    focus: "revenue",
    fact: "18.400 € yedi onaylı teklifte bekliyor. Hepsi sadece ödeme linki bekliyor.",
    why: "Bridge & Co. (8.400 €) ve Müller (4.200 €) toplamın yarısından fazlası. Bridge için süre kaçarsa benzer profil geçen ay kaybedildi.",
    recommendation:
      "Önce Bridge'e ayrı bir link at, sonra Müller'in linkini bugünkü takiple birleştir.",
    verb: "Teklifleri aç"
  },
  {
    id: "calendar",
    focus: "calendar",
    fact: "Yarın 10:30'da iki toplantı çakışıyor: 'Bridge demo' ve 'Müller call'.",
    why: "Her ikisi de takvimde aktif. Birisi reddedilmedikçe bir tarafı bekletmiş olursun ve yer açtığınla aramız soğur.",
    recommendation: "Bridge'i 11:00'a kaydır; Müller'i 10:30'da bırak — Müller'le konu daha kritik.",
    verb: "Takvimi aç"
  }
];

const DEMO_PANELS: Record<FocusKey, PanelData> = {
  customers: {
    label: "Customers",
    count: "4 waiting",
    headline: "Almanca grubu sıcak — Müller ve Klein'ı bugün ara.",
    rows: [
      { id: "muller", primary: "Hans Müller", secondary: "Almanca · 6 kişi", trailing: "6d" },
      { id: "klein", primary: "Anna Klein", secondary: "Almanca · özel istek", trailing: "3d" },
      { id: "schmidt", primary: "Peter Schmidt", secondary: "Almanca · single", trailing: "5d" },
      { id: "smith", primary: "John Smith", secondary: "İngilizce · aile", trailing: "4d" }
    ],
    pattern:
      "Dört müşteri 3–6 gündür sessiz. Hepsi Ahmet Serdar grubundan; ikisi yüksek değer (Müller, Klein), ikisi orta (Schmidt, Smith).",
    why: [
      "Bu profilin %72'si ilk hafta içinde rezervasyon yapıyor.",
      "7. günden sonra rezervasyon oranı %38 düşüyor.",
      "Hans Müller geçen yıl 12.000 € getirdi — yüksek tekrar profili."
    ],
    move: [
      "Müller — bugün · yüksek değer, hâlâ sıcak.",
      "Klein — bugün · özel istek yolladı, ciddi.",
      "Schmidt — yarın · single, aciliyet düşük.",
      "Smith — yarın · İngilizce, ayrı yaklaşım."
    ]
  },
  revenue: {
    label: "Revenue",
    count: "18.400 € pending",
    headline: "Bridge ve Müller zincirleme — önce o ikisinin linkini at.",
    rows: [
      { id: "bridge", primary: "Bridge & Co. proposal", secondary: "Approved 8d ago", trailing: "8.400 €" },
      { id: "muller-r", primary: "Müller group offer", secondary: "Approved 5d ago", trailing: "4.200 €" },
      { id: "schmidt-r", primary: "Schmidt single", secondary: "Approved 4d ago", trailing: "2.100 €" },
      { id: "klein-r", primary: "Klein add-on", secondary: "Approved 3d ago", trailing: "1.800 €" },
      { id: "smith-r", primary: "Smith family", secondary: "Approved 6d ago", trailing: "1.300 €" },
      { id: "yildiz", primary: "Yıldız tour", secondary: "Approved 2d ago", trailing: "400 €" },
      { id: "demir", primary: "Demir family", secondary: "Approved today", trailing: "200 €" }
    ],
    pattern:
      "Yedi onaylı teklifte 18.400 € bekliyor. İki tanesi (Bridge 8.400 €, Müller 4.200 €) toplamın %68'i. Geri kalan beşi düşük öncelik.",
    why: [
      "Bridge & Co. — geçen ay benzer profil süreyi kaçırınca kaybedildi.",
      "Müller — bugün ayrıca takip atılıyor; linkler aynı maile gidebilir.",
      "Diğer beş teklifin toplam değeri 5.800 € — düşük öncelik."
    ],
    move: [
      "Bridge & Co. — şimdi · ayrı bir Stripe linki + kısa not.",
      "Müller — bugünkü takip mailiyle birleştir.",
      "Geri kalan beş — toplu üret, akşam at."
    ]
  },
  tasks: {
    label: "Tasks",
    count: "5 open",
    headline: "İlk üç görev hızlı — 20 dakikada bitirebilirsin.",
    rows: [
      { id: "draft", primary: "Draft follow-ups", secondary: "4 customers · ~2 min" },
      { id: "links", primary: "Generate payment links", secondary: "7 offers · ~1 min" },
      { id: "bridge-c", primary: "Send Bridge contract", secondary: "~15 min" },
      { id: "itinerary", primary: "Update Schmidt itinerary", secondary: "~10 min" },
      { id: "refund", primary: "Review Klein refund", secondary: "~5 min" }
    ],
    pattern:
      "Beş açık görev var. Üçü iletişim, ikisi iç işlem. İletişim olanlar 'kısa süre, yüksek getiri' kategorisinde.",
    why: [
      "Beş günlük sessizliği müşteri olumsuz okur; her yarım gün geçtiğinde olasılık düşüyor.",
      "İç işlemler (itinerary update, refund review) acil değil — bugün sonuna yetişir."
    ],
    move: [
      "Draft follow-ups (4) — şimdi · 2 dakika.",
      "Generate payment links (7) — şimdi · 1 dakika.",
      "Bridge contract — bu sabah · 15 dakika.",
      "Itinerary ve refund — öğleden sonra."
    ]
  },
  calendar: {
    label: "Calendar",
    count: "next 7d",
    headline: "Yarın bir çakışma var; bugün başka önemli bir şey yok.",
    rows: [
      { id: "bridge", primary: "Bridge demo", secondary: "yarın · 10:30", trailing: "⚠" },
      { id: "muller", primary: "Müller call", secondary: "yarın · 10:30", trailing: "⚠" },
      { id: "schmidt", primary: "Schmidt itinerary review", secondary: "perşembe · 14:00" },
      { id: "klein", primary: "Klein Reisen check-in", secondary: "cuma · 11:00" }
    ],
    pattern:
      "Önümüzdeki yedi günde dört dış toplantı var. İki tanesi yarın aynı saatte; geri kalan ikisi normal hafta dolusu.",
    why: [
      "Bridge demo ve Müller call yarın 10:30'da çakışıyor. Birisi reddedilmedikçe bir tarafa söz vermiş oluyorsun.",
      "Müller call için son hazırlık notu üç hafta önce; Bridge için bu sabah Stripe linkini de göndermek anlamlı.",
      "Schmidt ve Klein toplantıları yeterli hazırlık zamanı bırakıyor."
    ],
    move: [
      "Bridge demo'yu 11:00'a kaydır — Stripe linki gönderince zaten o saatte konuşacaksın.",
      "Müller call için bugün öğleden sonra 10 dakikalık hazırlık notu yaz.",
      "Schmidt ve Klein için bir şey değiştirme."
    ]
  }
};

// Source that would need to be connected to turn each focus into a
// real action. Used in the focus column's honesty footer.
const FOCUS_SOURCE: Record<FocusKey, string> = {
  customers: "Gmail or a customer source",
  revenue: "Stripe or a payment provider",
  tasks: "Calendar or a task source",
  calendar: "Google Calendar (read-only)"
};

const FOCUS_DAY1_BLURB: Record<FocusKey, string> = {
  customers:
    "Once Operator can read your inbox, customers waiting on a reply will land here, ranked by how long they've waited and how warm they were.",
  revenue:
    "Once Operator can see your offers and payments, open offers will land here with the amount, the customer, and the next step.",
  tasks:
    "Once a calendar or task source is connected, today's work will land here, sorted by what unblocks the most.",
  calendar:
    "Once Calendar is connected, your week — conflicts, prep windows, important upcoming meetings — will land here."
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
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

  useEffect(() => {
    if (!focus) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeFocus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focus, closeFocus]);

  // Real briefing comes from the Sources store (computed by the
  // deterministic engine over the synced Google snapshot). The demo
  // mode keeps the hand-written content for reference / screenshots.
  const googleState = useSourcesStore((s) => s.google.state);
  const lastSyncMs = useSourcesStore((s) => s.google.lastSyncMs);
  const lastErrors = useSourcesStore((s) => s.google.lastErrors);
  const snapshot = useSourcesStore((s) => s.snapshot);
  const realBriefingItems = useSourcesStore((s) => s.briefing);
  const realPanelsRaw = useSourcesStore((s) => s.panels);
  const syncGoogle = useSourcesStore((s) => s.syncGoogle);
  const sourcesConnected = googleState === "connected" || googleState === "syncing" || googleState === "error";

  // Auto-sync on first mount when we have tokens but no snapshot
  // (just-connected case) or the snapshot is older than 5 minutes.
  const autoSyncedRef = useRef(false);
  useEffect(() => {
    if (autoSyncedRef.current) return;
    if (googleState !== "connected" && googleState !== "error") return;
    const stale = !snapshot || Date.now() - snapshot.syncedAt > 5 * 60 * 1000;
    if (!stale) return;
    autoSyncedRef.current = true;
    void syncGoogle().catch(() => {
      /* error state already captured by the store */
    });
  }, [googleState, snapshot, syncGoogle]);

  const firstName = getUserFirstName(isDemo);
  const greeting = greetingFor(now);

  // Map real engine briefing → local briefing shape.
  const realBriefing: BriefingItem[] = realBriefingItems.map((b: RealBriefingItem) => ({
    id: b.id,
    focus: b.focus as FocusKey,
    fact: b.fact,
    why: b.why,
    recommendation: b.recommendation,
    verb: b.verb
  }));

  // Map real engine panels → local panel shape. The COO mini-report
  // fields (pattern / why / move) are absent for real data; the focus
  // column knows to fall back to a quiet "Receipts" view + a note
  // about the optional AI provider.
  const realPanels: Record<FocusKey, PanelData> | null = realPanelsRaw
    ? {
        customers: liftPanel(realPanelsRaw.customers),
        revenue: liftPanel(realPanelsRaw.revenue),
        tasks: liftPanel(realPanelsRaw.tasks),
        calendar: liftPanel(realPanelsRaw.calendar)
      }
    : null;

  const briefing: BriefingItem[] = isDemo
    ? DEMO_BRIEFING
    : sourcesConnected
      ? realBriefing
      : [];
  const panels: Record<FocusKey, PanelData> | null = isDemo
    ? DEMO_PANELS
    : sourcesConnected
      ? realPanels
      : null;

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
          {/* Greeting · uses real user name, never the brain identity. */}
          <header className="flex flex-col gap-3">
            <h1 className="text-[32px] font-semibold leading-tight tracking-tight text-white">
              {firstName ? `${greeting}, ${firstName}.` : `${greeting}.`}
            </h1>
            <p className="max-w-2xl text-[15px] leading-relaxed text-white/65">
              {greetingSubtitle({
                isDemo,
                sourcesConnected,
                googleState,
                briefingCount: briefing.length,
                snapshot,
                lastErrors
              })}
            </p>
          </header>

          {sourcesConnected && (
            <WatchingBanner
              snapshot={snapshot}
              lastSyncMs={lastSyncMs}
              state={googleState}
              lastErrors={lastErrors}
              onSyncNow={() => {
                autoSyncedRef.current = true;
                void syncGoogle().catch(() => {});
              }}
            />
          )}

          {/* 40 % · Briefing — FACT / WHY / RECOMMENDATION */}
          <section aria-label="Executive briefing" className="flex flex-col gap-10">
            {briefing.length > 0 ? (
              briefing.map((item) => (
                <BriefingRow key={item.id} item={item} onOpen={() => openFocus(item.focus)} />
              ))
            ) : !sourcesConnected ? (
              <EmptyBriefing />
            ) : null}
          </section>

          {sourcesConnected && <DetectorSummary briefingItems={realBriefingItems} />}

          {/* 40 % · Workspace · decision support */}
          <section aria-label="Workspace" className="grid grid-cols-1 gap-x-10 gap-y-10 md:grid-cols-2">
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
        <FocusColumn focus={focus} data={panels?.[focus] ?? null} onClose={closeFocus} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Briefing · FACT / WHY / RECOMMENDATION
// ---------------------------------------------------------------------------

function BriefingRow({ item, onOpen }: { item: BriefingItem; onOpen: () => void }) {
  return (
    <article className="flex min-w-0 flex-col gap-3">
      <BriefingBlock label="Fact" body={item.fact} />
      <BriefingBlock label="Why it matters" body={item.why} />
      <BriefingBlock label="Recommendation" body={item.recommendation} emphasis />
      <button
        type="button"
        onClick={onOpen}
        className="self-start pt-1 text-[13px] text-white/65 transition hover:text-white"
      >
        ▸ {item.verb}
      </button>
    </article>
  );
}

function BriefingBlock({ label, body, emphasis }: { label: string; body: string; emphasis?: boolean }) {
  return (
    <div className="grid min-w-0 grid-cols-[140px_minmax(0,1fr)] items-baseline gap-x-6">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.15em] text-white/35">
        {label}
      </span>
      <p
        className={clsx(
          "min-w-0 leading-relaxed",
          emphasis ? "text-[15.5px] text-white" : "text-[15px] text-white/75"
        )}
      >
        {body}
      </p>
    </div>
  );
}

function EmptyBriefing() {
  return (
    <article className="flex flex-col gap-3">
      <BriefingBlock
        label="Fact"
        body="Hiçbir kaynağa bağlı değilim."
      />
      <BriefingBlock
        label="Why it matters"
        body="Yorum yapabilmem için önce sinyal görmem gerek. En küçük başlangıç gelen kutun."
      />
      <BriefingBlock
        label="Recommendation"
        body="Gmail'i bağla — yarın bu satırda gerçek bir özet olur."
        emphasis
      />
      <Link to="/settings" className="self-start pt-1 text-[13px] text-white/65 transition hover:text-white">
        ▸ Connect Gmail · ~30 saniye
      </Link>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Workspace panels · decision support
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
  const label = data?.label ?? defaultLabel(focus);
  const count = data?.count;

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <button
        type="button"
        onClick={onOpen}
        className="flex items-baseline justify-between gap-3 text-left"
      >
        <h2 className="text-[14px] font-semibold tracking-tight text-white">{label}</h2>
        <span className="text-[11.5px] text-white/40">
          {count ?? "needs setup"}
          <ArrowRight className="ml-1 inline h-3 w-3 -translate-y-px text-white/30" />
        </span>
      </button>

      {/* Operator's opinion — the line that makes this decision support, not CRM. */}
      {data ? (
        <p className="text-[13.5px] leading-relaxed text-white/85">{data.headline}</p>
      ) : (
        <p className="text-[13px] leading-relaxed text-white/45">
          {FOCUS_DAY1_BLURB[focus].split(". ")[0]}.
        </p>
      )}

      {/* Receipts — quiet rows below the opinion. */}
      {data && (
        <ul className="flex flex-col pt-1">
          {data.rows.slice(0, 4).map((r, i) => (
            <li
              key={r.id}
              className={clsx(
                "flex min-w-0 items-baseline justify-between gap-3 py-1.5",
                i > 0 && "border-t border-white/[0.03]"
              )}
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[12.5px] text-white/70">{r.primary}</span>
                <span className="truncate text-[11px] text-white/40">{r.secondary}</span>
              </span>
              {r.trailing && (
                <span className="shrink-0 text-[12px] tabular-nums text-white/55">{r.trailing}</span>
              )}
            </li>
          ))}
          {data.rows.length > 4 && (
            <li className="pt-1.5 text-[11px] text-white/40">+ {data.rows.length - 4} more</li>
          )}
        </ul>
      )}
    </section>
  );
}

/**
 * Convert an engine PanelData into the local PanelData shape used by
 * Home. Real data has no COO narrative (pattern / why / move) — the
 * focus column renders just the receipts plus a quiet AI-provider
 * note when those fields are absent.
 */
function liftPanel(p: RealPanelData): PanelData {
  return {
    label: p.label,
    count: p.count,
    headline: p.headline,
    rows: p.rows,
    pattern: "",
    why: [],
    move: []
  };
}

/**
 * Choose the right greeting subtitle for the current state. Honest
 * about why the briefing is short when it is.
 */
function greetingSubtitle(args: {
  isDemo: boolean;
  sourcesConnected: boolean;
  googleState: string;
  briefingCount: number;
  snapshot: { messages: unknown[]; events: unknown[]; contacts: unknown[] } | null;
  lastErrors: string[];
}): string {
  const { isDemo, sourcesConnected, googleState, briefingCount, snapshot, lastErrors } = args;
  if (isDemo) {
    return "Bu sabah üç şeye dikkat etmen gerek. Aşağıdaki paneller dayanak veriyi gösteriyor.";
  }
  if (!sourcesConnected) {
    return "Henüz bir kaynağa bağlı değilim, o yüzden bu sabah sana güvenebileceğin bir özet veremem. Bir kaynak bağlayalım — yarın gerçek bir özetle başlarız.";
  }
  if (googleState === "syncing" && !snapshot) {
    return "Operator senin için ilk taramayı yapıyor. Birkaç saniye…";
  }
  if (googleState === "error" && lastErrors.length > 0) {
    return "Son senkronizasyon başarısız oldu. Aşağıda detayı, kaynaktan yeniden denemek için \"Sync now\" düğmesi var.";
  }
  if (!snapshot) {
    return "Bağlandık, ama henüz veri taşımadım. Birkaç saniye içinde sabah özeti çıkacak.";
  }
  const msgs = snapshot.messages.length;
  const evs = snapshot.events.length;
  const con = snapshot.contacts.length;
  if (briefingCount > 0) {
    return `Bu sabah ${briefingCount === 1 ? "bir konu" : `${briefingCount} konu`} dikkatini hak ediyor. Paneller aşağıda dayanak veriyi gösteriyor.`;
  }
  // Connected with snapshot but no briefing items → say what we
  // actually scanned and why it's quiet.
  if (msgs === 0 && evs === 0) {
    return `Son 14 günde gelen kutunda ve önümüzdeki 14 günde takviminde hiçbir şey yok. ${con} kişi rehberinde. Bir başka hesabı bağlamak ister misin?`;
  }
  if (msgs === 0) {
    return `Son 14 günde gelen kutun boş. ${evs} takvim olayı var ama henüz dikkat isteyen bir şey yok.`;
  }
  if (evs === 0) {
    return `${msgs} mesaj taradım, dikkat isteyen bir şey yok. Önümüzdeki 14 günde takvim olayı da yok.`;
  }
  return `${msgs} mesaj ve ${evs} takvim olayı taradım — bugün için seni meşgul edecek bir şey görmüyorum. Paneller aşağıda neyi gördüğümü gösteriyor.`;
}

/**
 * Watching banner · prominent, unmistakable acknowledgement that
 * Operator is reading the connected source. This is the visible
 * proof that Settings has done its job.
 */
function WatchingBanner({
  snapshot,
  lastSyncMs,
  state,
  lastErrors,
  onSyncNow
}: {
  snapshot: { messages: unknown[]; events: unknown[]; contacts: unknown[] } | null;
  lastSyncMs: number | null;
  state: string;
  lastErrors: string[];
  onSyncNow: () => void;
}) {
  const msgs = snapshot?.messages.length ?? 0;
  const evs = snapshot?.events.length ?? 0;
  const con = snapshot?.contacts.length ?? 0;
  const isSyncing = state === "syncing";
  const isError = state === "error";
  return (
    <section
      aria-label="Operator is watching"
      className="flex flex-col gap-3 rounded-2xl bg-emerald-500/[0.04] px-5 py-4"
    >
      <header className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className={clsx(
              "h-2 w-2 rounded-full",
              isError ? "bg-rose-300" : isSyncing ? "animate-pulse bg-amber-300" : "bg-emerald-300"
            )}
          />
          <span className="text-[13.5px] font-medium text-white">
            Operator is watching Google Workspace
          </span>
        </span>
        <button
          type="button"
          onClick={onSyncNow}
          disabled={isSyncing}
          className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-3 py-1 text-[11.5px] font-medium text-white/85 transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={clsx("h-3 w-3", isSyncing && "animate-spin")} />
          {isSyncing ? "syncing…" : "sync now"}
        </button>
      </header>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-[13px] sm:grid-cols-3">
        <SrcLine label="Gmail" detail={`${msgs} messages (last 14d)`} />
        <SrcLine label="Calendar" detail={`${evs} events (next 14d)`} />
        <SrcLine label="Contacts" detail={`${con}`} />
      </dl>
      <footer className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[12px] text-white/55">
        <span>{lastSyncMs ? `Last sync ${formatAgo(lastSyncMs)}` : "Not synced yet"}</span>
        <span aria-hidden className="text-white/25">·</span>
        <Link
          to="/settings"
          className="inline-flex items-center gap-1 text-white/75 transition hover:text-white"
        >
          Open Google source details <ExternalLink className="h-3 w-3" />
        </Link>
      </footer>
      {isError && lastErrors.length > 0 && (
        <p className="rounded-lg bg-rose-500/[0.08] px-3 py-2 text-[12.5px] text-rose-200">
          Last sync failed · {lastErrors[0]}
        </p>
      )}
    </section>
  );
}

function SrcLine({ label, detail }: { label: string; detail: string }) {
  return (
    <span className="flex items-baseline gap-2">
      <dt className="text-white/55">{label}</dt>
      <dd className="text-white tabular-nums">{detail}</dd>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Detector summary · what Operator looked for today
// ---------------------------------------------------------------------------

interface DetectorRow {
  id: string;
  label: string;
}

const DETECTOR_ROWS: DetectorRow[] = [
  { id: "stale-customer-thread", label: "Stale customer threads" },
  { id: "unanswered-email", label: "Unanswered inbox mail" },
  { id: "commitment-detector", label: "Open commitments" },
  { id: "payment-keyword", label: "Payment-related messages" },
  { id: "calendar-conflict", label: "Calendar conflicts" },
  { id: "unprepared-meeting", label: "Unprepared meetings" }
];

function DetectorSummary({ briefingItems }: { briefingItems: RealBriefingItem[] }) {
  const fired: Set<string> = new Set(briefingItems.map((b) => b.detector));
  return (
    <section aria-label="What Operator looked for" className="flex flex-col gap-3">
      <h2 className="text-[13px] font-medium text-white/45">What I looked for today</h2>
      <ul className="grid grid-cols-1 gap-y-1.5 sm:grid-cols-2">
        {DETECTOR_ROWS.map((d) => {
          const found = fired.has(d.id);
          return (
            <li key={d.id} className="flex items-baseline gap-2 text-[13px]">
              <span
                aria-hidden
                className={clsx(
                  "h-1.5 w-1.5 shrink-0 translate-y-px rounded-full",
                  found ? "bg-emerald-300" : "bg-white/25"
                )}
              />
              <span className={found ? "text-white/85" : "text-white/55"}>{d.label}</span>
              <span className={clsx("ml-auto text-[12px]", found ? "text-emerald-300" : "text-white/35")}>
                {found ? "matched" : "nothing found"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function formatAgo(ts: number): string {
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function defaultLabel(focus: FocusKey): string {
  switch (focus) {
    case "customers":
      return "Customers";
    case "revenue":
      return "Revenue";
    case "tasks":
      return "Tasks";
    case "calendar":
      return "Calendar";
  }
}

// ---------------------------------------------------------------------------
// Focus column · COO mini-report
// ---------------------------------------------------------------------------

function FocusColumn({
  focus,
  data,
  onClose
}: {
  focus: FocusKey;
  data: PanelData | null;
  onClose: () => void;
}) {
  const label = data?.label ?? defaultLabel(focus);
  // The COO mini-report (pattern / why / move) is only available when
  // an AI provider is wired. Demo data ships it hand-written. Real
  // data from the deterministic engine doesn't — and we say so.
  const hasReport = !!data && !!data.pattern && data.why.length > 0 && data.move.length > 0;

  return (
    <aside
      role="complementary"
      aria-label={`${label} briefing`}
      className="flex w-full max-w-[560px] shrink-0 flex-col overflow-y-auto border-l border-white/[0.06] bg-white/[0.008]"
      style={{ animation: "focus-slide-in 220ms ease-out" }}
    >
      <header className="flex items-center justify-between gap-3 px-7 pb-1 pt-12">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[11px] uppercase tracking-[0.15em] text-white/35">Operator&apos;s read</span>
          <h2 className="text-[22px] font-semibold tracking-tight text-white">{label}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close briefing"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/45 transition hover:bg-white/[0.04] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {data ? (
        <div className="flex flex-col gap-8 px-7 pt-6">
          {hasReport ? (
            <>
              <ReportBlock label="The pattern">
                <p className="text-[14.5px] leading-relaxed text-white/85">{data.pattern}</p>
              </ReportBlock>

              <ReportBlock label="Why it matters">
                <ul className="flex flex-col gap-1.5 text-[14px] leading-relaxed text-white/75">
                  {data.why.map((line, i) => (
                    <li key={i} className="grid grid-cols-[16px_minmax(0,1fr)] gap-1">
                      <span aria-hidden className="text-white/35">·</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </ReportBlock>

              <ReportBlock label="The move">
                <ol className="flex flex-col gap-1.5 text-[14.5px] leading-relaxed text-white">
                  {data.move.map((line, i) => (
                    <li key={i} className="grid grid-cols-[20px_minmax(0,1fr)] gap-1">
                      <span aria-hidden className="font-medium text-white/55">{i + 1}.</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ol>
              </ReportBlock>
            </>
          ) : (
            <ReportBlock label="Operator's read">
              <p className="text-[14.5px] leading-relaxed text-white/85">{data.headline}</p>
              <p className="text-[12.5px] leading-relaxed text-white/45">
                The deeper read (pattern · why · move) needs an AI provider.
                Add an OpenAI / Anthropic / Ollama key in Settings → Providers
                to unlock the COO narrative on top of the deterministic engine.
              </p>
            </ReportBlock>
          )}

          {/* Receipts — quiet, at the bottom. */}
          <section className="flex flex-col gap-2 pt-2">
            <header className="flex items-baseline justify-between gap-3">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.15em] text-white/30">Receipts</span>
              <span className="text-[11.5px] text-white/35">{data.count}</span>
            </header>
            <ul className="flex flex-col">
              {data.rows.map((r, i) => (
                <li
                  key={r.id}
                  className={clsx(
                    "flex min-w-0 items-baseline justify-between gap-4 py-1.5",
                    i > 0 && "border-t border-white/[0.03]"
                  )}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[12.5px] text-white/65">{r.primary}</span>
                    <span className="truncate text-[11px] text-white/40">{r.secondary}</span>
                  </span>
                  {r.trailing && (
                    <span className="shrink-0 text-[12px] tabular-nums text-white/55">{r.trailing}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : (
        <div className="px-7 pt-6">
          <p className="text-[14px] leading-relaxed text-white/65">{FOCUS_DAY1_BLURB[focus]}</p>
        </div>
      )}

      <footer className="mt-auto flex flex-col gap-3 border-t border-white/[0.04] px-7 py-6">
        <p className="text-[12.5px] leading-relaxed text-white/45">
          Acting on this (drafting, sending, generating links) requires {FOCUS_SOURCE[focus]}. Operator won&apos;t fake an action until the source is connected.
        </p>
        <Link to="/settings" className="self-start text-[13px] text-white/85 transition hover:text-white">
          ▸ Open Settings
        </Link>
      </footer>

      <style>{`@keyframes focus-slide-in { from { transform: translateX(12px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </aside>
  );
}

function ReportBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.15em] text-white/35">{label}</span>
      {children}
    </section>
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

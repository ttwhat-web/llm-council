/**
 * Briefing engine.
 *
 * Pure orchestrator. Runs every detector against the workspace
 * snapshot, drops anything below the confidence floor, sorts by
 * priority and confidence, and returns at most five items.
 *
 * Also derives the four workspace panels (Customers · Revenue ·
 * Tasks · Calendar) from the same snapshot, so Home's "decision
 * support" rows are receipts for what the briefing claims.
 *
 * Never invents data. If the snapshot is empty, the result is empty.
 */

import type { WorkspaceSnapshot } from "@/services/google/types";
import type { BriefingItem, FocusKey, Priority } from "./types";
import { ALL_DETECTORS } from "./detectors";

const MAX_BRIEFING_ITEMS = 5;
const MIN_CONFIDENCE = 50;

const PRIORITY_ORDER: Record<Priority, number> = { high: 3, medium: 2, low: 1 };

// ---------------------------------------------------------------------------
// Briefing items
// ---------------------------------------------------------------------------

export function buildBriefing(snap: WorkspaceSnapshot, now: number = snap.syncedAt): BriefingItem[] {
  const all: BriefingItem[] = [];
  for (const detector of ALL_DETECTORS) {
    try {
      const items = detector(snap, now);
      for (const item of items) {
        if (item.confidence < MIN_CONFIDENCE) continue;
        all.push(item);
      }
    } catch {
      // Detectors are pure but defensively isolated. A bad detector
      // never poisons the rest of the briefing.
    }
  }

  // Sort: highest priority first, then by confidence.
  all.sort((a, b) => {
    const pri = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
    if (pri !== 0) return pri;
    return b.confidence - a.confidence;
  });

  return all.slice(0, MAX_BRIEFING_ITEMS);
}

// ---------------------------------------------------------------------------
// Workspace panels · receipts derived from the same snapshot
// ---------------------------------------------------------------------------

export interface PanelRow {
  id: string;
  primary: string;
  secondary: string;
  trailing?: string;
}

export interface PanelData {
  focus: FocusKey;
  label: string;
  count: string;
  /** Operator's opinion line shown under the title. */
  headline: string;
  rows: PanelRow[];
}

export type WorkspacePanels = Record<FocusKey, PanelData>;

export function buildPanels(snap: WorkspaceSnapshot, now: number = snap.syncedAt): WorkspacePanels {
  return {
    customers: safe("customers", "Customers", () => buildCustomersPanel(snap, now)),
    revenue: safe("revenue", "Revenue", () => buildRevenuePanel(snap, now)),
    tasks: safe("tasks", "Tasks", () => buildTasksPanel(snap, now)),
    calendar: safe("calendar", "Calendar", () => buildCalendarPanel(snap, now))
  };
}

function safe(focus: FocusKey, label: string, fn: () => PanelData): PanelData {
  try {
    return fn();
  } catch {
    return {
      focus,
      label,
      count: "error",
      headline: "Bu paneli oluştururken hata oldu. Tekrar denersek düzelir.",
      rows: []
    };
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

const FREE_EMAIL_PROVIDERS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "yandex.com",
  "yandex.ru",
  "gmx.com",
  "gmx.de",
  "mail.ru"
]);

/**
 * Empty string when the user is on a free email provider — there's
 * no meaningful "company domain" to filter out. Senders that share
 * the user's @gmail.com address are not "internal".
 */
function selfDomainOf(selfEmail: string): string {
  const d = (selfEmail.split("@")[1] ?? "").toLowerCase();
  if (FREE_EMAIL_PROVIDERS.has(d)) return "";
  return d;
}

function daysAgo(ms: number, now: number): number {
  return Math.max(0, Math.floor((now - ms) / DAY_MS));
}

const NOISE_DOMAINS = new Set(["google.com", "googlemail.com", "youtube.com", "linkedin.com", "github.com"]);
const NOISE_PREFIXES = ["noreply", "no-reply", "donotreply", "do-not-reply", "notifications"];
function isNoisy(addr: string): boolean {
  const a = addr.trim().toLowerCase();
  const local = a.split("@")[0] ?? "";
  if (NOISE_PREFIXES.some((p) => local.startsWith(p))) return true;
  const domain = a.split("@")[1] ?? "";
  return NOISE_DOMAINS.has(domain);
}

function isExternal(addr: string, selfDomain: string): boolean {
  const d = (addr.split("@")[1] ?? "").toLowerCase();
  if (d === "") return false;
  if (selfDomain === "") return true;
  return d !== selfDomain;
}

// ---------------------------------------------------------------------------
// Customers · threads awaiting my reply, ranked by silence
// ---------------------------------------------------------------------------

function buildCustomersPanel(snap: WorkspaceSnapshot, now: number): PanelData {
  const selfDomain = selfDomainOf(snap.selfEmail);
  const stales = [];
  for (const thread of snap.threads) {
    const msgs = thread.messages;
    if (msgs.length === 0) continue;
    const last = msgs[msgs.length - 1];
    if (last.isFromMe) continue;
    if (isNoisy(last.fromAddress)) continue;
    if (!isExternal(last.fromAddress, selfDomain)) continue;
    const days = daysAgo(last.date, now);
    if (days < 1) continue;
    stales.push({ thread, last, days });
  }
  stales.sort((a, b) => b.days - a.days);
  const rows: PanelRow[] = stales.slice(0, 6).map(({ thread, last, days }) => ({
    id: thread.id,
    primary: last.fromName || last.fromAddress,
    secondary: thread.subject || "(no subject)",
    trailing: `${days}d`
  }));
  const count = stales.length === 0 ? "all clear" : `${stales.length} waiting`;
  const headline = buildCustomersHeadline(stales.length, stales[0]?.days);
  return { focus: "customers", label: "Customers", count, headline, rows };
}

function buildCustomersHeadline(total: number, oldestDays?: number): string {
  if (total === 0) return "Cevap bekleyen yok. Sıralı bir sabah.";
  if (oldestDays != null && oldestDays >= 5) {
    return `En eski mesaj ${oldestDays} gün oldu — bugün ona dön.`;
  }
  if (total >= 4) return "Birkaç müşteri sırada — ilk üçü bugün hallet.";
  return "Cevap bekleyen birkaç mesaj var.";
}

// ---------------------------------------------------------------------------
// Revenue · payment / proposal / invoice mail
// ---------------------------------------------------------------------------

const PAYMENT_RE = /\b(invoice|fatura|faktura|teklif|proposal|offer|ödeme|payment|tahsil|wire|havale|iban|stripe)\b/i;
const AMOUNT_RE = /(?:€|£|\$|₺|TL|EUR|USD|GBP)\s?[\d.,]+|\b[\d]{2,}[\d.,]*\s?(?:€|£|\$|₺|TL|EUR|USD|GBP)/g;

function buildRevenuePanel(snap: WorkspaceSnapshot, now: number): PanelData {
  const selfDomain = selfDomainOf(snap.selfEmail);
  const hits = [];
  for (const msg of snap.messages) {
    if (msg.isFromMe) continue;
    if (isNoisy(msg.fromAddress)) continue;
    if (!isExternal(msg.fromAddress, selfDomain)) continue;
    const text = `${msg.subject}\n${msg.snippet}`;
    if (!PAYMENT_RE.test(text)) continue;
    const days = daysAgo(msg.date, now);
    if (days > 14) continue;
    const amounts = text.match(AMOUNT_RE);
    hits.push({ msg, amount: amounts?.[0], days });
  }
  hits.sort((a, b) => a.days - b.days);
  const rows: PanelRow[] = hits.slice(0, 6).map(({ msg, amount, days }) => ({
    id: msg.id,
    primary: msg.subject || "(no subject)",
    secondary: `${msg.fromName || msg.fromAddress} · ${days}d ago`,
    trailing: amount
  }));
  const count = hits.length === 0 ? "no signals" : `${hits.length} signals`;
  const headline = buildRevenueHeadline(hits.length);
  return { focus: "revenue", label: "Revenue", count, headline, rows };
}

function buildRevenueHeadline(total: number): string {
  if (total === 0) return "Para konulu canlı sinyal yok. Stripe bağlandığında daha keskin olur.";
  if (total >= 3) return "Birkaç teklif/ödeme zincirleme — sırayla kapatmaya değer.";
  return "Para konulu bir mesaj var, ihmal etme.";
}

// ---------------------------------------------------------------------------
// Tasks · open commitments + unanswered first-touch
// ---------------------------------------------------------------------------

const COMMITMENT_RE =
  /\b(i['’]?ll get back|let me check|i['’]?ll send|i['’]?ll follow up|geri dönüş yapacağım|cevap yazacağım|sonra ileteceğim)\b/i;

function buildTasksPanel(snap: WorkspaceSnapshot, now: number): PanelData {
  // Open commitments (mine, with no follow-up).
  const open = [];
  for (const thread of snap.threads) {
    let mine = null;
    for (let i = thread.messages.length - 1; i >= 0; i--) {
      const m = thread.messages[i];
      if (!m.isFromMe) continue;
      const text = `${m.subject}\n${m.snippet}`;
      if (COMMITMENT_RE.test(text)) {
        mine = m;
        break;
      }
    }
    if (!mine) continue;
    const later = thread.messages.find((m) => m.isFromMe && m.date > mine!.date);
    if (later) continue;
    const days = daysAgo(mine.date, now);
    open.push({ thread, mine, days });
  }
  open.sort((a, b) => b.days - a.days);
  const rows: PanelRow[] = open.slice(0, 6).map(({ thread, mine, days }) => ({
    id: thread.id,
    primary: thread.subject || "(no subject)",
    secondary: `söz verildi · ${days}d ago`,
    trailing: `${days}d`
  }));
  const count = open.length === 0 ? "none open" : `${open.length} open`;
  const headline = buildTasksHeadline(open.length, open[0]?.days);
  return { focus: "tasks", label: "Tasks", count, headline, rows };
}

function buildTasksHeadline(total: number, oldestDays?: number): string {
  if (total === 0) return "Açık taahhüt yok. Söz tut, sıra tut.";
  if (oldestDays != null && oldestDays >= 5) {
    return `En eski açık taahhüt ${oldestDays} gün oldu — bugün kapat.`;
  }
  return "Birkaç söz açık duruyor — kısa cevaplar bile sıyırır.";
}

// ---------------------------------------------------------------------------
// Calendar · next 7 days
// ---------------------------------------------------------------------------

function buildCalendarPanel(snap: WorkspaceSnapshot, now: number): PanelData {
  const upcoming = snap.events
    .filter((e) => e.endMs > now && e.startMs < now + 7 * DAY_MS)
    .sort((a, b) => a.startMs - b.startMs);
  const rows: PanelRow[] = upcoming.slice(0, 6).map((ev) => ({
    id: ev.id,
    primary: ev.summary || "(no title)",
    secondary: ev.isAllDay
      ? "all day"
      : new Date(ev.startMs).toLocaleString("tr-TR", { weekday: "short", hour: "2-digit", minute: "2-digit" }),
    trailing: ev.attendees.length > 1 ? `${ev.attendees.length}` : undefined
  }));
  const count = upcoming.length === 0 ? "clear week" : `${upcoming.length} next 7d`;
  const headline = buildCalendarHeadline(upcoming.length);
  return { focus: "calendar", label: "Calendar", count, headline, rows };
}

function buildCalendarHeadline(total: number): string {
  if (total === 0) return "Hafta açık. Düşünmek için zaman var.";
  if (total <= 3) return "Hafif bir hafta. Önemli olanları sabaha çek.";
  if (total >= 10) return "Yoğun hafta — bugün sabah iki saatini bloka çek.";
  return "Hafta dolu ama yönetilir.";
}

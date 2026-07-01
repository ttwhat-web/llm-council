/**
 * Deterministic briefing detectors.
 *
 * Each detector is a pure function:  WorkspaceSnapshot → BriefingItem[].
 *
 * No randomness. No clocks (the snapshot carries `syncedAt` for "now").
 * No LLM calls. All decisions are explainable by reading the function
 * body. The engine's behaviour is fully described by the fixtures
 * in `tests/briefing.test.ts` — change a detector, update a fixture.
 *
 * Confidence scores are conservative: when a heuristic could be wrong
 * the item is dropped. Silence is honest; a wrong recommendation is not.
 */

import type {
  CalendarEvent,
  GmailMessage,
  GmailThread,
  WorkspaceSnapshot
} from "@/services/google/types";
import type { BriefingItem, EvidenceRef } from "./types";

// ---------------------------------------------------------------------------
// Helpers — kept module-private so the detectors stay small and readable.
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

/** Address domains that are noise, not customers. */
const NOISE_DOMAINS = new Set([
  "google.com",
  "googlemail.com",
  "accounts.google.com",
  "noreply.google.com",
  "youtube.com",
  "linkedin.com",
  "github.com",
  "no-reply.com",
  "notifications.com"
]);

/** Address local-parts that are automated. */
const NOISE_PREFIXES = ["noreply", "no-reply", "donotreply", "do-not-reply", "notifications", "support+"];

function isNoisySender(addr: string): boolean {
  const a = addr.trim().toLowerCase();
  if (!a) return true;
  const local = a.split("@")[0] ?? "";
  if (NOISE_PREFIXES.some((p) => local.startsWith(p))) return true;
  const domain = a.split("@")[1] ?? "";
  if (NOISE_DOMAINS.has(domain)) return true;
  return false;
}

function isExternalSender(addr: string, selfDomain: string): boolean {
  const d = (addr.split("@")[1] ?? "").toLowerCase();
  if (d === "") return false;
  // For free email providers (personal Gmail, Yahoo, Outlook, etc.)
  // the self-domain doesn't define a company boundary — every sender
  // is "external". Returning true here means we don't filter anyone
  // out based on domain match.
  if (selfDomain === "") return true;
  return d !== selfDomain;
}

/**
 * Returns the company domain for the user, or "" if the user is on a
 * free email provider where "internal vs external" makes no sense.
 * When "" is returned, every sender is treated as external — only the
 * noise filter (noreply / google notifications) trims results.
 */
function selfDomainOf(selfEmail: string): string {
  const d = (selfEmail.split("@")[1] ?? "").toLowerCase();
  if (FREE_EMAIL_PROVIDERS.has(d)) return "";
  return d;
}

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

function daysAgo(ms: number, now: number): number {
  return Math.max(0, Math.floor((now - ms) / DAY_MS));
}

function displayNameOf(msg: GmailMessage): string {
  return msg.fromName || msg.fromAddress;
}

// ---------------------------------------------------------------------------
// 1 · Stale customer threads
// Customer wrote me, I haven't replied, more than 3 days ago.
// ---------------------------------------------------------------------------

interface StaleThread {
  thread: GmailThread;
  lastInbound: GmailMessage;
  daysSilent: number;
}

export function detectStaleCustomerThreads(
  snap: WorkspaceSnapshot,
  now: number = snap.syncedAt
): BriefingItem[] {
  const selfDomain = selfDomainOf(snap.selfEmail);
  const stales: StaleThread[] = [];

  for (const thread of snap.threads) {
    const msgs = thread.messages;
    if (msgs.length === 0) continue;
    const last = msgs[msgs.length - 1];
    // Most recent must be inbound (waiting on me).
    if (last.isFromMe) continue;
    if (isNoisySender(last.fromAddress)) continue;
    if (!isExternalSender(last.fromAddress, selfDomain)) continue;
    const days = daysAgo(last.date, now);
    if (days < 3) continue;
    stales.push({ thread, lastInbound: last, daysSilent: days });
  }

  if (stales.length === 0) return [];

  // Rank by days silent, then by number of messages in the thread
  // (longer thread = more engagement = higher cost of dropping).
  stales.sort((a, b) => {
    if (b.daysSilent !== a.daysSilent) return b.daysSilent - a.daysSilent;
    return b.thread.messages.length - a.thread.messages.length;
  });

  const top = stales.slice(0, 6);
  const oldest = top[0];
  const peopleNames = top.map((s) => displayNameOf(s.lastInbound)).slice(0, 3);
  const moreCount = top.length - peopleNames.length;
  const peopleList =
    peopleNames.join(", ") + (moreCount > 0 ? ` (+${moreCount})` : "");

  const evidence: EvidenceRef[] = top.map((s) => ({ kind: "thread", threadId: s.thread.id }));

  return [
    {
      id: "stale-customer-thread",
      detector: "stale-customer-thread",
      focus: "customers",
      priority: oldest.daysSilent >= 5 ? "high" : "medium",
      confidence: Math.min(100, 60 + oldest.daysSilent * 5),
      fact: `${top.length} müşteri cevap bekliyor (${peopleList}). En eski mesaj ${oldest.daysSilent} gün önce geldi.`,
      why:
        "Her geçen gün cevap olasılığı düşer. 5 günden sonra konuşma çoğunlukla soğur.",
      recommendation: `Bugün ${top.length === 1 ? "bu kişiye" : "ilk üç kişiye"} kısa bir takip yaz.`,
      verb: "Müşterileri aç",
      evidence
    }
  ];
}

// ---------------------------------------------------------------------------
// 2 · Unanswered emails in the inbox (less specific than #1)
// Inbox + from a real human + I never replied + 1–5 days old.
// ---------------------------------------------------------------------------

export function detectUnansweredInboxMail(
  snap: WorkspaceSnapshot,
  now: number = snap.syncedAt
): BriefingItem[] {
  const selfDomain = selfDomainOf(snap.selfEmail);
  // For each thread, find threads whose latest message is inbound, in the inbox,
  // and the thread has NO outbound message at all from me (vs. #1 which also
  // catches threads where I replied long ago and a new question came in).
  const candidates: { thread: GmailThread; last: GmailMessage; days: number }[] = [];

  for (const thread of snap.threads) {
    const msgs = thread.messages;
    if (msgs.length === 0) continue;
    const last = msgs[msgs.length - 1];
    if (last.isFromMe) continue;
    if (!last.isInInbox) continue;
    if (isNoisySender(last.fromAddress)) continue;
    if (!isExternalSender(last.fromAddress, selfDomain)) continue;
    const days = daysAgo(last.date, now);
    if (days < 1 || days >= 5) continue;
    // Exclude threads where the user has ever replied — those are handled
    // by the stale-customer detector with different language.
    if (msgs.some((m) => m.isFromMe)) continue;
    candidates.push({ thread, last, days });
  }

  if (candidates.length === 0) return [];

  candidates.sort((a, b) => b.days - a.days);
  const top = candidates.slice(0, 5);
  const oldest = top[0];
  const evidence: EvidenceRef[] = top.map((c) => ({ kind: "thread", threadId: c.thread.id }));

  return [
    {
      id: "unanswered-inbox",
      detector: "unanswered-email",
      focus: "customers",
      priority: oldest.days >= 3 ? "medium" : "low",
      confidence: 50 + oldest.days * 5,
      fact: `${top.length} yeni mesaj cevapsız kaldı. ${displayNameOf(oldest.last)} dahil — en eskisi ${oldest.days} gün önce.`,
      why:
        "Henüz hiç cevap vermedin. İlk cevap hızı bir kişinin sana ne kadar ciddiye alındığını hissettiğini belirler.",
      recommendation: "Hızlı bir kabul/cevap notu, ikna edici uzun cevaptan daha değerli olabilir.",
      verb: "Gelen kutusunu aç",
      evidence
    }
  ];
}

// ---------------------------------------------------------------------------
// 3 · Commitment detector
// My outbound messages containing "I'll get back to you" style phrases,
// where I haven't followed up.
// ---------------------------------------------------------------------------

const COMMITMENT_PATTERNS = [
  /\bi['’]?ll get back to you\b/i,
  /\bi will get back to you\b/i,
  /\blet me check\b/i,
  /\bi['’]?ll send (you|this|that)\b/i,
  /\bi will send\b/i,
  /\bi['’]?ll follow up\b/i,
  /\bback to you (tomorrow|next week|soon)\b/i,
  /\bsana (yarın|hafta içinde|en geç) dön\b/i,
  /\bgeri dönüş yapacağım\b/i,
  /\bcevap yazacağım\b/i,
  /\bsonra ileteceğim\b/i
];

export function detectOpenCommitments(
  snap: WorkspaceSnapshot,
  now: number = snap.syncedAt
): BriefingItem[] {
  const open: { thread: GmailThread; commitment: GmailMessage; days: number }[] = [];

  for (const thread of snap.threads) {
    const msgs = thread.messages;
    // Find the last outbound message in the thread that matches a commitment.
    let myCommitment: GmailMessage | null = null;
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i];
      if (!m.isFromMe) continue;
      const text = `${m.subject}\n${m.snippet}`;
      if (COMMITMENT_PATTERNS.some((re) => re.test(text))) {
        myCommitment = m;
        break;
      }
    }
    if (!myCommitment) continue;
    // The commitment is "open" if there's no later outbound message from me
    // (i.e. I haven't sent a follow-up).
    const laterFromMe = msgs.find((m) => m.isFromMe && m.date > myCommitment!.date);
    if (laterFromMe) continue;
    const days = daysAgo(myCommitment.date, now);
    if (days < 2) continue;
    open.push({ thread, commitment: myCommitment, days });
  }

  if (open.length === 0) return [];

  open.sort((a, b) => b.days - a.days);
  const top = open.slice(0, 5);
  const oldest = top[0];
  const evidence: EvidenceRef[] = top.map((o) => ({ kind: "message", messageId: o.commitment.id }));

  return [
    {
      id: "open-commitments",
      detector: "commitment-detector",
      focus: "tasks",
      priority: oldest.days >= 5 ? "high" : "medium",
      confidence: Math.min(95, 55 + oldest.days * 8),
      fact: `${top.length} açık taahhüt var — birinde "geri dönüş yapacağım" dedin, ${oldest.days} gün oldu.`,
      why:
        "Söz verip kapatmadığın iş güveni en hızlı eriten şey. Karşı taraf hatırlar.",
      recommendation:
        "Bugün en eskisini kapat. Kısa bir not bile yeter — sessizlikten iyidir.",
      verb: "Taahhütleri aç",
      evidence
    }
  ];
}

// ---------------------------------------------------------------------------
// 4 · Payment keyword spotter
// Inbox messages mentioning invoice / payment / proposal / amounts.
// ---------------------------------------------------------------------------

const PAYMENT_KEYWORDS = [
  /\binvoice\b/i,
  /\bfaktura\b/i,
  /\bfatura\b/i,
  /\bproposal\b/i,
  /\bteklif\b/i,
  /\boffer\b/i,
  /\bpayment\b/i,
  /\bödeme\b/i,
  /\btahsil/i,
  /\bbank transfer\b/i,
  /\bhavale\b/i,
  /\bwire\b/i,
  /\biban\b/i,
  /\bstripe\b/i
];

const AMOUNT_RE = /(?:€|£|\$|₺|TL|EUR|USD|GBP)\s?[\d.,]+|\b[\d]{2,}[\d.,]*\s?(?:€|£|\$|₺|TL|EUR|USD|GBP)/g;

export function detectPaymentMail(
  snap: WorkspaceSnapshot,
  now: number = snap.syncedAt
): BriefingItem[] {
  const selfDomain = selfDomainOf(snap.selfEmail);
  const hits: { msg: GmailMessage; amount?: string; days: number }[] = [];

  for (const msg of snap.messages) {
    if (msg.isFromMe) continue;
    if (isNoisySender(msg.fromAddress)) continue;
    if (!isExternalSender(msg.fromAddress, selfDomain)) continue;
    const text = `${msg.subject}\n${msg.snippet}`;
    const hasKeyword = PAYMENT_KEYWORDS.some((re) => re.test(text));
    if (!hasKeyword) continue;
    const days = daysAgo(msg.date, now);
    if (days > 14) continue;
    const amounts = text.match(AMOUNT_RE);
    hits.push({ msg, amount: amounts?.[0], days });
  }

  if (hits.length === 0) return [];

  hits.sort((a, b) => a.days - b.days);
  const top = hits.slice(0, 5);
  const evidence: EvidenceRef[] = top.map((h) => ({ kind: "message", messageId: h.msg.id }));

  const amountsSeen = top.map((h) => h.amount).filter((x): x is string => !!x);
  const amountClause = amountsSeen.length > 0 ? ` (${amountsSeen.slice(0, 3).join(", ")})` : "";

  return [
    {
      id: "payment-mail",
      detector: "payment-keyword",
      focus: "revenue",
      priority: hits.length >= 3 ? "high" : "medium",
      confidence: 50 + Math.min(40, hits.length * 6),
      fact: `${top.length} para konulu mesaj var${amountClause}.`,
      why:
        "Teklif, fatura veya ödeme konusu — bekledikçe nakit gecikiyor ve karşı tarafın aklı dağılıyor.",
      recommendation: "Stripe / banka linkleri burada zincirleme atılabilir.",
      verb: "Teklifleri aç",
      evidence
    }
  ];
}

// ---------------------------------------------------------------------------
// 5 · Calendar conflict
// Two events that overlap (excluding all-day events as background).
// ---------------------------------------------------------------------------

export interface ConflictPair {
  a: CalendarEvent;
  b: CalendarEvent;
}

/**
 * Pure · every overlapping pair of (non-all-day) events in the next
 * 7 days, sorted so the soonest-starting conflict comes first. `a` is
 * always the earlier-starting event of the pair, `b` the one that
 * overlaps into it — shared by the briefing detector below and by the
 * calendar move executor's UI, so both agree on what counts as a
 * conflict and which event is "the one that moved".
 */
export function findConflictPairs(events: CalendarEvent[], now: number): ConflictPair[] {
  const upcoming = events
    .filter((e) => !e.isAllDay)
    .filter((e) => e.endMs > now && e.startMs < now + 7 * DAY_MS)
    .sort((a, b) => a.startMs - b.startMs);

  const pairs: ConflictPair[] = [];
  for (let i = 0; i < upcoming.length; i++) {
    for (let j = i + 1; j < upcoming.length; j++) {
      const a = upcoming[i];
      const b = upcoming[j];
      if (b.startMs >= a.endMs) break; // sorted, future ones can't overlap a
      pairs.push({ a, b });
    }
  }
  return pairs.sort((p, q) => p.a.startMs - q.a.startMs);
}

export function detectCalendarConflicts(
  snap: WorkspaceSnapshot,
  now: number = snap.syncedAt
): BriefingItem[] {
  const pairs = findConflictPairs(snap.events, now);

  if (pairs.length === 0) return [];

  // findConflictPairs already sorts soonest-first.
  const first = pairs[0];
  const evidence: EvidenceRef[] = [
    { kind: "event", eventId: first.a.id },
    { kind: "event", eventId: first.b.id }
  ];

  const when = new Date(first.a.startMs).toLocaleString("tr-TR", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit"
  });

  return [
    {
      id: "calendar-conflict",
      detector: "calendar-conflict",
      focus: "calendar",
      priority: first.a.startMs - now < DAY_MS ? "high" : "medium",
      confidence: 95,
      fact: `${when} için iki toplantı çakışıyor: "${first.a.summary}" ve "${first.b.summary}".`,
      why:
        "Her iki toplantı da takvimde aktif. Birisi reddedilmedikçe bir tarafı bekletmiş olursun.",
      recommendation: "Birini bugün ertele.",
      verb: "Takvimi aç",
      evidence
    }
  ];
}

// ---------------------------------------------------------------------------
// 6 · Unprepared meeting
// External meeting within the next 24h where I haven't exchanged email
// with any attendee in the last 7 days.
// ---------------------------------------------------------------------------

export function detectUnpreparedMeetings(
  snap: WorkspaceSnapshot,
  now: number = snap.syncedAt
): BriefingItem[] {
  const selfDomain = selfDomainOf(snap.selfEmail);
  const upcoming = snap.events
    .filter((e) => !e.isAllDay)
    .filter((e) => e.startMs > now && e.startMs < now + DAY_MS)
    .sort((a, b) => a.startMs - b.startMs);

  // Build the set of email addresses we corresponded with in the last 7d.
  const cutoff = now - 7 * DAY_MS;
  const recent = new Set<string>();
  for (const msg of snap.messages) {
    if (msg.date < cutoff) continue;
    recent.add(msg.fromAddress);
    for (const t of msg.toAddresses) recent.add(t);
  }

  const unprepared: CalendarEvent[] = [];
  for (const ev of upcoming) {
    const external = ev.attendees.filter(
      (a) =>
        !a.isSelf &&
        a.email !== "" &&
        (a.email.split("@")[1] ?? "").toLowerCase() !== selfDomain
    );
    if (external.length === 0) continue; // internal meetings are fine
    const anyRecent = external.some((a) => recent.has(a.email));
    if (anyRecent) continue;
    unprepared.push(ev);
  }

  if (unprepared.length === 0) return [];

  const first = unprepared[0];
  const evidence: EvidenceRef[] = unprepared.slice(0, 3).map((e) => ({ kind: "event", eventId: e.id }));

  const when = new Date(first.startMs).toLocaleString("tr-TR", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
  const externalNames = first.attendees
    .filter((a) => !a.isSelf)
    .map((a) => a.displayName || a.email)
    .slice(0, 2)
    .join(", ");

  return [
    {
      id: "unprepared-meeting",
      detector: "unprepared-meeting",
      focus: "calendar",
      priority: first.startMs - now < 6 * 60 * 60 * 1000 ? "high" : "medium",
      confidence: 75,
      fact: `${when} "${first.summary}" — son 7 günde ${externalNames || "katılımcılarla"} yazışman yok.`,
      why:
        "Bu kişiyle güncel bir konu zincirin yok. Toplantı başlarken bağlam soğuk girer.",
      recommendation:
        "5 dakikada bir hazırlık notu yaz; konuşacağın üç maddeyi belirle.",
      verb: "Takvimi aç",
      evidence
    }
  ];
}

// ---------------------------------------------------------------------------
// All detectors in canonical order.
// ---------------------------------------------------------------------------

export const ALL_DETECTORS = [
  detectStaleCustomerThreads,
  detectUnansweredInboxMail,
  detectOpenCommitments,
  detectPaymentMail,
  detectCalendarConflicts,
  detectUnpreparedMeetings
] as const;

/**
 * Company Brain · subject resolution.
 *
 * Turns "Hans", "Bridge", "Klein proposal", or "tomorrow's customer
 * meeting" into a real identity — an email address already seen in
 * Gmail or Calendar, never a guessed one. Ambiguity is never silently
 * picked for the founder: two people matching "Hans" comes back as an
 * honest ambiguous result, not a coin flip.
 */

import type { WorkspaceSnapshot } from "@/services/google/types";
import type { SubjectResolution } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

interface KnownPerson {
  email: string;
  displayName: string;
  lastSeenAt: number;
}

function collectKnownPeople(snapshot: WorkspaceSnapshot): KnownPerson[] {
  const byEmail = new Map<string, KnownPerson>();
  for (const m of snapshot.messages) {
    if (m.isFromMe || !m.fromAddress) continue;
    const existing = byEmail.get(m.fromAddress);
    if (!existing || m.date > existing.lastSeenAt) {
      byEmail.set(m.fromAddress, { email: m.fromAddress, displayName: m.fromName || m.fromAddress, lastSeenAt: m.date });
    }
  }
  for (const e of snapshot.events) {
    for (const a of e.attendees) {
      if (a.isSelf || !a.email) continue;
      if (!byEmail.has(a.email)) {
        byEmail.set(a.email, { email: a.email, displayName: a.displayName || a.email, lastSeenAt: e.startMs });
      }
    }
  }
  return Array.from(byEmail.values());
}

function isMeetingQuery(q: string): boolean {
  return /\b(meeting|call|demo|sync|standup|review)\b/.test(q);
}

/** "tomorrow's customer meeting" → the soonest upcoming external
 *  meeting in the matching window, resolved to its external attendee.
 *  A real calendar filter, not a guess. */
function resolveFromMeetingQuery(q: string, snapshot: WorkspaceSnapshot, now: number): SubjectResolution {
  const wantsTomorrow = /\btomorrow\b/.test(q);
  const windowStart = wantsTomorrow ? now + DAY_MS : now;
  const windowEnd = wantsTomorrow ? now + 2 * DAY_MS : now + 7 * DAY_MS;

  const upcoming = snapshot.events
    .filter((e) => !e.isAllDay && e.startMs >= windowStart && e.startMs < windowEnd)
    .sort((a, b) => a.startMs - b.startMs);

  for (const ev of upcoming) {
    const external = ev.attendees.find((a) => !a.isSelf && !!a.email);
    if (external) {
      return { kind: "resolved", subjectKey: external.email, displayName: external.displayName || external.email };
    }
  }
  return { kind: "not-found" };
}

export function resolveSubject(query: string, snapshot: WorkspaceSnapshot | null, now: number = Date.now()): SubjectResolution {
  if (!snapshot) return { kind: "not-found" };
  const q = normalize(query);
  if (!q) return { kind: "not-found" };

  const people = collectKnownPeople(snapshot);

  // Name matches only — an email/domain fragment that happens to
  // overlap several people's addresses (e.g. "bridge" in
  // alice@bridge.co and bob@bridge.co) is a company signal, not a
  // "did you mean this specific person" ambiguity, so it's handled
  // separately below rather than forcing a person-level ambiguous result.
  const nameMatches = people.filter((p) => normalize(p.displayName).includes(q));
  const exactName = nameMatches.filter((p) => normalize(p.displayName) === q);
  if (exactName.length === 1) return { kind: "resolved", subjectKey: exactName[0].email, displayName: exactName[0].displayName };
  if (nameMatches.length === 1) {
    return { kind: "resolved", subjectKey: nameMatches[0].email, displayName: nameMatches[0].displayName };
  }
  if (nameMatches.length > 1) {
    return { kind: "ambiguous", candidates: nameMatches.map((p) => p.displayName) };
  }

  // A full, exact email address — always unambiguous.
  const exactEmail = people.find((p) => normalize(p.email) === q);
  if (exactEmail) return { kind: "resolved", subjectKey: exactEmail.email, displayName: exactEmail.displayName };

  // No direct person match — a company/topic name ("Bridge", "Klein
  // proposal") mentioned in message content, attributed to whoever
  // actually sent those messages.
  const topicSenders = new Map<string, string>();
  for (const m of snapshot.messages) {
    if (m.isFromMe) continue;
    if (!(m.subject.toLowerCase().includes(q) || m.snippet.toLowerCase().includes(q))) continue;
    topicSenders.set(m.fromAddress, m.fromName || m.fromAddress);
  }
  if (topicSenders.size === 1) {
    const [email, displayName] = [...topicSenders.entries()][0];
    return { kind: "resolved", subjectKey: email, displayName };
  }
  if (topicSenders.size > 1) {
    // Spans more than one person — treat the query itself as the
    // subject (a company, not an individual). Evidence gathering still
    // filters by this same topic text rather than one inbox identity.
    return { kind: "resolved", subjectKey: `topic:${q}`, displayName: query.trim() };
  }

  if (isMeetingQuery(q)) {
    return resolveFromMeetingQuery(q, snapshot, now);
  }

  return { kind: "not-found" };
}

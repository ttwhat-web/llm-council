/**
 * Google Calendar · read-only client. UNVERIFIED against a live
 * account from this sandbox.
 *
 * Scope used: calendar.readonly. No writes — ever.
 */

import { ensureAccessToken } from "./oauthClient";
import type { CalendarAttendee, CalendarEvent } from "./types";

const API = "https://www.googleapis.com/calendar/v3";

interface RawAttendee {
  email?: string;
  displayName?: string;
  self?: boolean;
  responseStatus?: string;
}

interface RawEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
  attendees?: RawAttendee[];
  hangoutLink?: string;
  conferenceData?: { entryPoints?: Array<{ uri?: string; entryPointType?: string }> };
}

interface ListEventsResponse {
  items?: RawEvent[];
  nextPageToken?: string;
}

/**
 * List events in the primary calendar over a window. Caller passes
 * the window endpoints; we paginate up to `maxEvents`.
 */
export async function listEvents(opts: {
  startMs: number;
  endMs: number;
  selfEmail: string;
  calendarId?: string;
  maxEvents?: number;
}): Promise<CalendarEvent[]> {
  const token = await ensureAccessToken();
  const calendarId = opts.calendarId ?? "primary";
  const maxEvents = opts.maxEvents ?? 200;
  const collected: CalendarEvent[] = [];
  let pageToken: string | undefined;
  let safety = 0;
  while (collected.length < maxEvents && safety < 5) {
    safety++;
    const params = new URLSearchParams({
      timeMin: new Date(opts.startMs).toISOString(),
      timeMax: new Date(opts.endMs).toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: String(Math.min(250, maxEvents - collected.length))
    });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await fetch(
      `${API}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error(`Calendar list failed (${res.status}): ${await res.text().catch(() => "")}`);
    const data = (await res.json()) as ListEventsResponse;
    for (const e of data.items ?? []) {
      collected.push(normaliseEvent(e, calendarId, opts.selfEmail));
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return collected;
}

function normaliseEvent(raw: RawEvent, calendarId: string, selfEmail: string): CalendarEvent {
  const startDate = raw.start?.date;
  const endDate = raw.end?.date;
  const startDateTime = raw.start?.dateTime;
  const endDateTime = raw.end?.dateTime;
  const isAllDay = !!startDate && !startDateTime;
  const startMs = startDateTime ? Date.parse(startDateTime) : startDate ? Date.parse(startDate) : 0;
  const endMs = endDateTime ? Date.parse(endDateTime) : endDate ? Date.parse(endDate) : 0;
  const attendees: CalendarAttendee[] = (raw.attendees ?? []).map((a) => {
    const email = (a.email ?? "").toLowerCase();
    return {
      email,
      displayName: a.displayName,
      isSelf: !!a.self || email === selfEmail,
      responseStatus: a.responseStatus
    };
  });
  const conferenceUrl =
    raw.hangoutLink ||
    raw.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === "video")?.uri;
  return {
    id: raw.id,
    calendarId,
    summary: raw.summary ?? "",
    description: raw.description ?? "",
    startMs,
    endMs,
    isAllDay,
    location: raw.location ?? "",
    attendees,
    conferenceUrl
  };
}

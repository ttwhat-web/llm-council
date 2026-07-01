/**
 * Google Calendar · write client. UNVERIFIED against a live account
 * from this sandbox — same honesty caveat as calendarClient.ts.
 *
 * Scope used: calendar.events (see oauthClient.ts CALENDAR_WRITE_SCOPE).
 * This is a separate, narrower scope from calendar.readonly and is
 * only ever requested behind explicit founder consent — never bundled
 * into the base connect flow.
 *
 * One verb only: move an event to a new start/end time (PATCH). No
 * create, no delete — Operator only ever touches events that already
 * exist and only the field the founder approved changing.
 */

import { ensureAccessToken } from "./oauthClient";

const API = "https://www.googleapis.com/calendar/v3";

export interface MoveEventInput {
  eventId: string;
  calendarId?: string;
  newStartMs: number;
  newEndMs: number;
}

export interface MoveEventResult {
  id: string;
  htmlLink?: string;
}

export async function moveEvent(input: MoveEventInput): Promise<MoveEventResult> {
  const token = await ensureAccessToken();
  const calendarId = input.calendarId ?? "primary";
  const res = await fetch(
    `${API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(input.eventId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        start: { dateTime: new Date(input.newStartMs).toISOString() },
        end: { dateTime: new Date(input.newEndMs).toISOString() }
      })
    }
  );
  if (res.status === 403) {
    const text = await res.text().catch(() => "");
    if (/insufficient/i.test(text)) {
      throw new Error("Requires Calendar write permission. Grant it in Settings → Sources.");
    }
    throw new Error(`Calendar move failed (403): ${text}`);
  }
  if (!res.ok) {
    throw new Error(`Calendar move failed (${res.status}): ${await res.text().catch(() => "")}`);
  }
  const data = (await res.json()) as { id?: string; htmlLink?: string };
  return { id: data.id ?? input.eventId, htmlLink: data.htmlLink };
}

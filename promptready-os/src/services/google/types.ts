/**
 * Google Workspace types · the minimal shape Operator needs to reason
 * about Gmail messages, Calendar events, and Contacts.
 *
 * These are NOT the full Google API responses. They're projections:
 * just the fields the deterministic briefing engine cares about.
 * The API clients translate from Google's raw responses into these
 * shapes so the engine can be tested in isolation, against pure
 * fixtures, with no network.
 */

// ---------------------------------------------------------------------------
// Mail
// ---------------------------------------------------------------------------

export interface GmailMessage {
  /** Gmail's stable message id (e.g. "18d3b2..."). */
  id: string;
  /** Thread the message belongs to. */
  threadId: string;
  /** Unix ms timestamp of the message. */
  date: number;
  /** Display name or address of the sender. Empty if unknown. */
  fromName: string;
  /** Email address only. Lowercased. */
  fromAddress: string;
  /** Recipient addresses (To). Lowercased. */
  toAddresses: string[];
  /** Subject line. May be empty. */
  subject: string;
  /** First ~200 chars of the body, plain text. */
  snippet: string;
  /** Whether this message is from the user themselves (sent box). */
  isFromMe: boolean;
  /** Whether the message lives in the user's inbox. */
  isInInbox: boolean;
  /** Whether the message is marked unread. */
  isUnread: boolean;
  /** Labels Gmail attached to the message (lowercased). */
  labels: string[];
}

export interface GmailThread {
  /** Thread id. */
  id: string;
  /** Messages in the thread, ordered oldest → newest. */
  messages: GmailMessage[];
  /** Subject of the most recent message. */
  subject: string;
}

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

export interface CalendarAttendee {
  /** Lowercased email. */
  email: string;
  /** Display name when Google has one. */
  displayName?: string;
  /** Whether this attendee is the user themselves. */
  isSelf: boolean;
  /** "accepted" | "tentative" | "declined" | "needsAction" | undefined. */
  responseStatus?: string;
}

export interface CalendarEvent {
  /** Google's event id. */
  id: string;
  /** Calendar id this event belongs to (usually "primary"). */
  calendarId: string;
  /** Title of the event. */
  summary: string;
  /** Description (may be empty). */
  description: string;
  /** Unix ms timestamp · start. */
  startMs: number;
  /** Unix ms timestamp · end. */
  endMs: number;
  /** All-day event? */
  isAllDay: boolean;
  /** Where the event happens (free text). */
  location: string;
  /** Attendees, including the user themselves if invited. */
  attendees: CalendarAttendee[];
  /** Conference link if present (Meet / Zoom / etc.) */
  conferenceUrl?: string;
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

export interface Contact {
  /** People API resource id. */
  id: string;
  /** Best-effort display name. */
  displayName: string;
  /** Primary email if present (lowercased). */
  primaryEmail?: string;
  /** All emails (lowercased). */
  emails: string[];
  /** Company name if present. */
  organization?: string;
}

// ---------------------------------------------------------------------------
// Workspace bundle · what the sync engine produces and what the
// briefing engine consumes.
// ---------------------------------------------------------------------------

export interface WorkspaceSnapshot {
  /** Unix ms timestamp the snapshot was taken. */
  syncedAt: number;
  /** The user's own email (lowercased). Used to detect "isFromMe". */
  selfEmail: string;
  /** Last 14 days of messages. */
  messages: GmailMessage[];
  /** Threads built from those messages (one entry per unique threadId). */
  threads: GmailThread[];
  /** Next 14 days of calendar events. */
  events: CalendarEvent[];
  /** All contacts. */
  contacts: Contact[];
}

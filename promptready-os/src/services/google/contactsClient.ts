/**
 * Google People · read-only client. UNVERIFIED against a live
 * account from this sandbox.
 *
 * Scope used: contacts.readonly. No writes — ever.
 */

import { ensureAccessToken } from "./oauthClient";
import type { Contact } from "./types";

const API = "https://people.googleapis.com/v1/people/me/connections";

interface RawPerson {
  resourceName?: string;
  names?: Array<{ displayName?: string }>;
  emailAddresses?: Array<{ value?: string; metadata?: { primary?: boolean } }>;
  organizations?: Array<{ name?: string }>;
}

interface ListResponse {
  connections?: RawPerson[];
  nextPageToken?: string;
}

export async function listContacts(maxContacts = 500): Promise<Contact[]> {
  const token = await ensureAccessToken();
  const collected: Contact[] = [];
  let pageToken: string | undefined;
  let safety = 0;
  while (collected.length < maxContacts && safety < 10) {
    safety++;
    const params = new URLSearchParams({
      personFields: "names,emailAddresses,organizations",
      pageSize: String(Math.min(1000, maxContacts - collected.length))
    });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await fetch(`${API}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Contacts list failed (${res.status}): ${await res.text().catch(() => "")}`);
    const data = (await res.json()) as ListResponse;
    for (const p of data.connections ?? []) {
      const c = normalisePerson(p);
      if (c) collected.push(c);
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return collected;
}

function normalisePerson(raw: RawPerson): Contact | null {
  if (!raw.resourceName) return null;
  const emails = (raw.emailAddresses ?? [])
    .map((e) => (e.value ?? "").toLowerCase())
    .filter(Boolean);
  if (emails.length === 0) return null;
  const primary =
    raw.emailAddresses?.find((e) => e.metadata?.primary)?.value?.toLowerCase() ?? emails[0];
  return {
    id: raw.resourceName,
    displayName: raw.names?.[0]?.displayName ?? primary,
    primaryEmail: primary,
    emails,
    organization: raw.organizations?.[0]?.name
  };
}

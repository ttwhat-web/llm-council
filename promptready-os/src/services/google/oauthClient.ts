/**
 * Google OAuth client · UNVERIFIED — see banner in the Sources card.
 *
 * Manual-paste authorization-code flow:
 *   1. User creates a "Desktop app" OAuth client in Google Cloud
 *      Console and pastes the Client ID + Client Secret into
 *      Settings → Sources.
 *   2. User adds redirect URI `http://127.0.0.1:1421/oauth/google/callback`
 *      to the OAuth client in Google Cloud Console.
 *   3. We open Google's authorization URL in the system browser.
 *      After consent the browser redirects to the loopback URL and
 *      fails to load (we don't run a server there), but the address
 *      bar carries `?code=…`.
 *   4. User copies the FULL URL from the address bar back into our
 *      "Paste callback URL" field.
 *   5. We parse the code and exchange it at the token endpoint.
 *   6. Tokens stored in localStorage (not encrypted yet — banner
 *      tells the user; encryption lands before billing).
 */

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

/**
 * Fixed loopback redirect URI on a real port. Google's docs allow
 * any loopback host + port for desktop apps. We use 1421 to avoid
 * Tauri's dev server (1420). The user pastes the URL the browser
 * fails to load — the URL still carries `?code=…`.
 */
export const REDIRECT_URI = "http://127.0.0.1:1421/oauth/google/callback";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/contacts.readonly",
  "openid",
  "email"
];

/**
 * Calendar write scope — NOT in the base SCOPES list. The initial
 * "Connect Google" flow only ever requests read access. This scope is
 * only ever requested when the founder explicitly clicks "Grant
 * Calendar write access" in Settings, via buildAuthorizationUrl's
 * extraScopes param (Google's incremental-auth pattern: the new
 * consent screen shows only the new scope, previously granted scopes
 * stay granted).
 */
export const CALENDAR_WRITE_SCOPE = "https://www.googleapis.com/auth/calendar.events";

const STORAGE_CREDENTIALS = "operator.google.credentials.v1";
const STORAGE_TOKENS = "operator.google.tokens.v1";

export interface GoogleCredentials {
  clientId: string;
  clientSecret: string;
}

export interface GoogleTokens {
  accessToken: string;
  refreshToken: string;
  /** Unix ms timestamp when the access token expires. */
  expiresAtMs: number;
  /** ID token (JWT) — used only to extract the user's email locally. */
  idToken?: string;
  /** Lowercased user email parsed from the id_token, if present. */
  email?: string;
  /** Scopes Google actually granted (from the token response's `scope`
   *  field) — the authoritative answer to "can we write to Calendar",
   *  never assumed from which URL we happened to open. */
  grantedScopes?: string[];
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

export function readCredentials(): GoogleCredentials | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_CREDENTIALS);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.clientId !== "string" || typeof parsed?.clientSecret !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCredentials(c: GoogleCredentials): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_CREDENTIALS, JSON.stringify(c));
}

export function clearCredentials(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_CREDENTIALS);
}

export function readTokens(): GoogleTokens | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_TOKENS);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.accessToken !== "string" || typeof parsed?.expiresAtMs !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeTokens(t: GoogleTokens): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_TOKENS, JSON.stringify(t));
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_TOKENS);
}

// ---------------------------------------------------------------------------
// Authorization URL
// ---------------------------------------------------------------------------

/** Returns null when the id is empty or doesn't look like a Google
 * OAuth Web/Desktop client id. */
export function validateClientId(clientId: string): string | null {
  const id = (clientId ?? "").trim();
  if (!id) return "Client ID is empty.";
  if (!id.endsWith(".apps.googleusercontent.com")) {
    return "Client ID must end with .apps.googleusercontent.com.";
  }
  return null;
}

/**
 * extraScopes lets a caller request additional, narrower scopes on
 * top of the base set — used for the Calendar-write upgrade, which is
 * never bundled into the base connect flow. include_granted_scopes
 * means previously granted scopes are preserved; the consent screen
 * only asks about what's new.
 */
export function buildAuthorizationUrl(clientId: string, extraScopes: string[] = []): string {
  const err = validateClientId(clientId);
  if (err) throw new Error(err);
  const params = new URLSearchParams({
    client_id: clientId.trim(),
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: [...SCOPES, ...extraScopes].join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true"
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Code parsing · the user pastes either a raw `code=…` value or the
// full redirect URL containing it.
// ---------------------------------------------------------------------------

export function parseAuthorizationCode(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Full URL paste.
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/?") || trimmed.includes("?code=")) {
    try {
      const url = new URL(trimmed.startsWith("/") ? `http://x${trimmed}` : trimmed);
      const code = url.searchParams.get("code");
      if (code) return code;
    } catch {
      /* fall through */
    }
  }
  // Looks like a bare code if there are no whitespace chars.
  if (/^[A-Za-z0-9_\-./]+$/.test(trimmed)) return trimmed;
  return null;
}

// ---------------------------------------------------------------------------
// Token exchange
// ---------------------------------------------------------------------------

interface RawTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  id_token?: string;
  scope?: string;
  token_type?: string;
}

export async function exchangeCodeForTokens(
  credentials: GoogleCredentials,
  code: string
): Promise<GoogleTokens> {
  const body = new URLSearchParams({
    code,
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code"
  });
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google token exchange failed (${res.status}): ${text || res.statusText}`);
  }
  const raw = (await res.json()) as RawTokenResponse;
  if (!raw.refresh_token) {
    // Google only returns a refresh_token on the first consent with
    // prompt=consent. Without one we can't refresh later.
    throw new Error(
      "Google did not return a refresh token. Revoke the app in your Google Account and retry."
    );
  }
  const tokens: GoogleTokens = {
    accessToken: raw.access_token,
    refreshToken: raw.refresh_token,
    expiresAtMs: Date.now() + (raw.expires_in - 60) * 1000,
    idToken: raw.id_token,
    email: raw.id_token ? extractEmailFromIdToken(raw.id_token) : undefined,
    grantedScopes: raw.scope ? raw.scope.split(" ").filter(Boolean) : undefined
  };
  writeTokens(tokens);
  return tokens;
}

/** True only when Google's token response actually included the
 *  Calendar write scope — never inferred from which button was
 *  clicked or which flow ran. */
export function hasCalendarWriteScope(): boolean {
  return !!readTokens()?.grantedScopes?.includes(CALENDAR_WRITE_SCOPE);
}

/**
 * Returns a valid (non-expired) access token, refreshing if needed.
 * Throws if the user is not connected or the refresh fails.
 */
export async function ensureAccessToken(): Promise<string> {
  const credentials = readCredentials();
  if (!credentials) throw new Error("Google is not configured. Add Client ID/Secret in Settings → Sources.");
  const tokens = readTokens();
  if (!tokens) throw new Error("Not connected to Google. Connect in Settings → Sources.");
  if (Date.now() < tokens.expiresAtMs) return tokens.accessToken;
  const refreshed = await refreshAccessToken(credentials, tokens.refreshToken);
  writeTokens(refreshed);
  return refreshed.accessToken;
}

async function refreshAccessToken(
  credentials: GoogleCredentials,
  refreshToken: string
): Promise<GoogleTokens> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    grant_type: "refresh_token"
  });
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google token refresh failed (${res.status}): ${text || res.statusText}`);
  }
  const raw = (await res.json()) as RawTokenResponse;
  return {
    accessToken: raw.access_token,
    refreshToken: raw.refresh_token ?? refreshToken,
    expiresAtMs: Date.now() + (raw.expires_in - 60) * 1000,
    idToken: raw.id_token,
    email: raw.id_token ? extractEmailFromIdToken(raw.id_token) : readTokens()?.email,
    // Google's refresh response doesn't always echo `scope`; the grant
    // itself didn't change on a refresh, so fall back to what we
    // already had rather than losing the calendar-write flag.
    grantedScopes: raw.scope ? raw.scope.split(" ").filter(Boolean) : readTokens()?.grantedScopes
  };
}

// ---------------------------------------------------------------------------
// Tiny JWT decoder (no signature check — we only read self-asserted claims
// for display; the email is also re-fetched from Gmail's profile endpoint).
// ---------------------------------------------------------------------------

function extractEmailFromIdToken(idToken: string): string | undefined {
  try {
    const parts = idToken.split(".");
    if (parts.length < 2) return undefined;
    const payload = parts[1];
    const padded = payload + "===".slice((payload.length + 3) % 4);
    const json = JSON.parse(atob(padded.replace(/-/g, "+").replace(/_/g, "/")));
    const email = typeof json.email === "string" ? (json.email as string).toLowerCase() : undefined;
    return email;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Disconnect (revokes locally; does NOT call Google's revoke endpoint —
// users can revoke at https://myaccount.google.com/permissions)
// ---------------------------------------------------------------------------

export function disconnect(): void {
  clearTokens();
}

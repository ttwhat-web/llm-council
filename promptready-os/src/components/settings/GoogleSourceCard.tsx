"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader, RefreshCw, ShieldCheck, X } from "lucide-react";
import clsx from "clsx";
import { useSourcesStore } from "@/store/sources";
import {
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  parseAuthorizationCode,
  readCredentials,
  validateClientId,
  REDIRECT_URI
} from "@/services/google/oauthClient";
import { CalendarWriteConsent, GmailArchiveConsent } from "@/components/settings/GoogleScopeConsent";

/**
 * Google Workspace · Sources card.
 *
 * UNVERIFIED end-to-end from the sandbox; the OAuth dance must be
 * tested live on Mac. Everything below compiles and the UI shows the
 * right states, but the actual token exchange depends on Google
 * accepting the manual-paste flow with a user-provided OAuth client.
 *
 * What this card does:
 *   1. Captures the user's OAuth Client ID + Client Secret (their
 *      own — created in Google Cloud Console as a "Desktop app"
 *      with redirect URI matching REDIRECT_URI below).
 *   2. Opens Google's authorization URL in a new tab.
 *   3. After consent, the browser redirects to the loopback URL and
 *      fails to load (no server runs there). The user copies the
 *      FULL URL from the address bar back into our "Paste callback
 *      URL" field.
 *   4. We parse the code and exchange it for tokens.
 *   5. Triggers a first sync and shows the result.
 *
 * Honesty banners are non-removable:
 *   * "Read-only — no send, no delete, no modify."
 *   * "Tokens stored locally on this device (not encrypted in v1)."
 *   * "Unverified — this Google integration has not been tested live
 *      from our build sandbox yet. Report breakage."
 */

export function GoogleSourceCard() {
  const google = useSourcesStore((s) => s.google);
  const lastSyncMs = google.lastSyncMs;
  const saveCreds = useSourcesStore((s) => s.saveGoogleCredentials);
  const refreshState = useSourcesStore((s) => s.refreshGoogleState);
  const sync = useSourcesStore((s) => s.syncGoogle);
  const disconnect = useSourcesStore((s) => s.disconnectGoogle);

  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [callbackPaste, setCallbackPaste] = useState("");
  const [busy, setBusy] = useState<"connect" | "sync" | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Hydrate fields from stored credentials (so the user can see them).
  useEffect(() => {
    const stored = readCredentials();
    if (stored) {
      setClientId(stored.clientId);
      setClientSecret(stored.clientSecret);
    }
  }, []);

  const onSaveCreds = useCallback(() => {
    const id = clientId.trim();
    const secret = clientSecret.trim();
    if (!id || !secret) {
      setLocalError("Both Client ID and Client Secret are required.");
      return;
    }
    const formatErr = validateClientId(id);
    if (formatErr) {
      setLocalError(formatErr);
      return;
    }
    setLocalError(null);
    saveCreds(id, secret);
  }, [clientId, clientSecret, saveCreds]);

  const onOpenConsent = useCallback(() => {
    // Always use the saved credentials' clientId, not the field, so
    // the URL matches what Google Cloud Console has on file.
    const stored = readCredentials();
    if (!stored) {
      setLocalError("Save Client ID + Secret first.");
      return;
    }
    setLocalError(null);
    let url: string;
    try {
      url = buildAuthorizationUrl(stored.clientId);
    } catch (e) {
      setLocalError(`Could not build the Google authorization URL: ${(e as Error).message}`);
      return;
    }
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      setLocalError(
        "Browser blocked the popup. Allow pop-ups for Operator Center, or copy the URL manually: " + url
      );
    }
  }, []);

  const onExchange = useCallback(async () => {
    const creds = readCredentials();
    if (!creds) {
      setLocalError("Save Client ID + Secret first.");
      return;
    }
    const code = parseAuthorizationCode(callbackPaste);
    if (!code) {
      setLocalError("Could not find a `code=…` in the pasted URL.");
      return;
    }
    setBusy("connect");
    setLocalError(null);
    try {
      await exchangeCodeForTokens(creds, code);
      refreshState();
      setCallbackPaste("");
      await sync();
    } catch (e) {
      setLocalError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }, [callbackPaste, refreshState, sync]);

  const onSync = useCallback(async () => {
    setBusy("sync");
    setLocalError(null);
    try {
      await sync();
    } catch (e) {
      setLocalError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }, [sync]);

  const onDisconnect = useCallback(() => {
    if (!confirm("Disconnect Google? Tokens and the local snapshot will be removed.")) return;
    disconnect();
    setCallbackPaste("");
  }, [disconnect]);

  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-white/[0.025] p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[11px] uppercase tracking-[0.15em] text-white/40">Sources</span>
          <h2 className="text-[18px] font-semibold tracking-tight text-white">Google Workspace</h2>
          <p className="text-[13px] leading-relaxed text-white/60">
            Reads Gmail, Calendar, and Contacts to brief you. Sending mail and
            moving calendar events only ever happen when you explicitly
            approve them, one action at a time — never automatically.
          </p>
        </div>
        <ConnectionPill state={google.state} />
      </header>

      <HonestyBanners />

      {google.state === "connected" || google.state === "syncing" || google.state === "error" ? (
        <ConnectedView
          email={google.selfEmail}
          lastSyncMs={lastSyncMs}
          state={google.state}
          errors={google.lastErrors}
          busy={busy === "sync"}
          calendarWriteGranted={google.calendarWriteGranted}
          gmailModifyGranted={google.gmailModifyGranted}
          onSync={onSync}
          onDisconnect={onDisconnect}
        />
      ) : (
        <SetupView
          clientId={clientId}
          clientSecret={clientSecret}
          callbackPaste={callbackPaste}
          state={google.state}
          busy={busy === "connect"}
          onClientIdChange={setClientId}
          onClientSecretChange={setClientSecret}
          onCallbackPasteChange={setCallbackPaste}
          onSaveCreds={onSaveCreds}
          onOpenConsent={onOpenConsent}
          onExchange={onExchange}
        />
      )}

      {localError && (
        <p className="rounded-lg bg-rose-500/[0.08] px-3 py-2 text-[12.5px] text-rose-200">{localError}</p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Connection pill
// ---------------------------------------------------------------------------

function ConnectionPill({ state }: { state: string }) {
  const map: Record<string, { label: string; tone: string }> = {
    disconnected: { label: "Not connected", tone: "bg-white/[0.05] text-white/55" },
    "needs-auth": { label: "Needs sign-in", tone: "bg-amber-500/[0.12] text-amber-200" },
    connected: { label: "Connected", tone: "bg-emerald-500/[0.12] text-emerald-200" },
    syncing: { label: "Syncing…", tone: "bg-accent/[0.15] text-accent" },
    error: { label: "Sync error", tone: "bg-rose-500/[0.12] text-rose-200" }
  };
  const { label, tone } = map[state] ?? map.disconnected;
  return (
    <span className={clsx("shrink-0 rounded-full px-3 py-1 text-[11px] font-medium", tone)}>{label}</span>
  );
}

// ---------------------------------------------------------------------------
// Honesty banners — non-removable
// ---------------------------------------------------------------------------

function HonestyBanners() {
  return (
    <div className="flex flex-col gap-2">
      <Banner tone="emerald" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
        Read for the briefing; send only what you approve. Operator never deletes
        or modifies mail, and never sends without your one-tap approval + a
        30-second undo.
      </Banner>
      <Banner tone="amber">
        Tokens are stored locally on this device, not encrypted in this build.
        Encryption lands before billing is enabled.
      </Banner>
      <Banner tone="rose">
        Unverified — this Google integration has not been tested live from our build sandbox.
        If something breaks during sign-in or sync, the bug is here, not in your Google account.
      </Banner>
    </div>
  );
}

function Banner({
  children,
  tone,
  icon
}: {
  children: React.ReactNode;
  tone: "emerald" | "amber" | "rose";
  icon?: React.ReactNode;
}) {
  const cls = {
    emerald: "bg-emerald-500/[0.06] text-emerald-200/85",
    amber: "bg-amber-500/[0.06] text-amber-200/85",
    rose: "bg-rose-500/[0.06] text-rose-200/85"
  }[tone];
  return (
    <p className={clsx("flex items-start gap-2 rounded-lg px-3 py-2 text-[12px] leading-relaxed", cls)}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <span>{children}</span>
    </p>
  );
}

// ---------------------------------------------------------------------------
// Setup view (disconnected / needs-auth)
// ---------------------------------------------------------------------------

function SetupView(props: {
  clientId: string;
  clientSecret: string;
  callbackPaste: string;
  state: string;
  busy: boolean;
  onClientIdChange: (v: string) => void;
  onClientSecretChange: (v: string) => void;
  onCallbackPasteChange: (v: string) => void;
  onSaveCreds: () => void;
  onOpenConsent: () => void;
  onExchange: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Step n={1} title="Create an OAuth client in Google Cloud Console">
        <p className="text-[12.5px] leading-relaxed text-white/60">
          Visit{" "}
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-white/85 underline-offset-2 hover:text-white hover:underline"
          >
            Google Cloud Console <ExternalLink className="h-3 w-3" />
          </a>
          {" "}→ Credentials → Create OAuth client ID → Application type: <strong>Desktop app</strong>.
          Enable the Gmail, Calendar, and People APIs in your project.
        </p>
        <div className="flex flex-col gap-1.5 rounded-lg bg-white/[0.025] p-3">
          <span className="text-[11px] text-white/50">
            Add this exact redirect URI to your OAuth client&apos;s &quot;Authorized redirect URIs&quot; list:
          </span>
          <RedirectUriBox uri={REDIRECT_URI} />
        </div>
        <div className="grid grid-cols-1 gap-2 pt-2 md:grid-cols-2">
          <Field
            label="Client ID"
            value={props.clientId}
            onChange={props.onClientIdChange}
            placeholder="…apps.googleusercontent.com"
          />
          <Field
            label="Client Secret"
            value={props.clientSecret}
            onChange={props.onClientSecretChange}
            placeholder="GOCSPX-…"
            secret
          />
        </div>
        <button
          type="button"
          onClick={props.onSaveCreds}
          className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-[12.5px] font-medium text-white transition hover:bg-white/[0.1]"
        >
          Save credentials
        </button>
      </Step>

      <Step n={2} title="Authorize in your browser">
        <p className="text-[12.5px] leading-relaxed text-white/60">
          Opens Google&apos;s consent screen in a new tab. After you authorize, your browser will redirect to{" "}
          <code className="rounded bg-white/[0.06] px-1.5 py-px text-[11.5px]">{REDIRECT_URI}?code=…</code>{" "}
          and fail to load — that&apos;s expected. Copy the entire URL from the address bar.
        </p>
        <button
          type="button"
          onClick={props.onOpenConsent}
          disabled={props.state !== "needs-auth"}
          title={
            props.state !== "needs-auth"
              ? "Save your Client ID and Client Secret first."
              : undefined
          }
          className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent/90 px-3 py-1.5 text-[12.5px] font-medium text-white transition hover:bg-accent disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-white/45"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open Google consent
        </button>
      </Step>

      <Step n={3} title="Paste the callback URL">
        <Field
          label="Callback URL"
          value={props.callbackPaste}
          onChange={props.onCallbackPasteChange}
          placeholder={`${REDIRECT_URI}?code=…`}
        />
        <button
          type="button"
          onClick={props.onExchange}
          disabled={props.busy || props.state !== "needs-auth" || !props.callbackPaste.trim()}
          className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12.5px] font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/[0.15] disabled:text-white/45"
        >
          {props.busy ? <Loader className="h-3.5 w-3.5 animate-spin" /> : null}
          Finish connecting
        </button>
      </Step>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Connected view
// ---------------------------------------------------------------------------

function ConnectedView(props: {
  email: string | null;
  lastSyncMs: number | null;
  state: string;
  errors: string[];
  busy: boolean;
  calendarWriteGranted: boolean;
  gmailModifyGranted: boolean;
  onSync: () => void;
  onDisconnect: () => void;
}) {
  const ago = props.lastSyncMs ? formatRelative(props.lastSyncMs) : "never";
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
        <dt className="text-white/45">Account</dt>
        <dd className="text-white/90">{props.email ?? "unknown"}</dd>
        <dt className="text-white/45">Last sync</dt>
        <dd className="text-white/90">{ago}</dd>
        <dt className="text-white/45">Watching</dt>
        <dd className="text-white/90">Gmail (last 14d) · Calendar (next 14d) · Contacts</dd>
      </dl>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={props.onSync}
          disabled={props.busy}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-[12.5px] font-medium text-white transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {props.busy ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Sync now
        </button>
        <button
          type="button"
          onClick={props.onDisconnect}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] text-white/55 transition hover:text-white"
        >
          <X className="h-3.5 w-3.5" /> Disconnect
        </button>
      </div>

      {props.errors.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-lg bg-rose-500/[0.06] p-3 text-[12px] text-rose-200">
          {props.errors.map((e, i) => (
            <li key={i}>· {e}</li>
          ))}
        </ul>
      )}

      <CalendarWriteConsent granted={props.calendarWriteGranted} />
      <GmailArchiveConsent granted={props.gmailModifyGranted} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Atoms
// ---------------------------------------------------------------------------

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-xl bg-white/[0.012] p-4">
      <header className="flex items-center gap-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.08] text-[11px] font-semibold text-white/85">
          {n}
        </span>
        <h3 className="text-[14px] font-medium text-white">{title}</h3>
      </header>
      <div className="flex flex-col gap-2 pl-9">{children}</div>
    </section>
  );
}

function RedirectUriBox({ uri }: { uri: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(uri);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }, [uri]);
  return (
    <div className="flex items-center gap-2 rounded-md bg-black/30 px-3 py-2">
      <code className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-white">{uri}</code>
      <button
        type="button"
        onClick={onCopy}
        className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-white/65 transition hover:bg-white/[0.06] hover:text-white"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  secret
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  secret?: boolean;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] text-white/50">{label}</span>
      <input
        type={secret ? "password" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        className="rounded-md bg-white/[0.04] px-3 py-2 font-mono text-[12px] text-white placeholder:text-white/30 focus:bg-white/[0.06] focus:outline-none"
      />
    </label>
  );
}

function formatRelative(ts: number): string {
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

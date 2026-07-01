"use client";

/**
 * Calendar write · explicit, separate consent — never bundled into the
 * base read-only "Connect Google" flow. Split out of GoogleSourceCard
 * to keep that file under the repo's size limit.
 */

import { useCallback, useState } from "react";
import { ExternalLink, Loader } from "lucide-react";
import { useSourcesStore } from "@/store/sources";
import {
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  parseAuthorizationCode,
  readCredentials,
  CALENDAR_WRITE_SCOPE,
  REDIRECT_URI
} from "@/services/google/oauthClient";

export function CalendarWriteConsent({ granted }: { granted: boolean }) {
  const refreshState = useSourcesStore((s) => s.refreshGoogleState);
  const [awaitingPaste, setAwaitingPaste] = useState(false);
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onOpenConsent = useCallback(() => {
    const stored = readCredentials();
    if (!stored) {
      setError("Save Client ID + Secret first.");
      return;
    }
    setError(null);
    let url: string;
    try {
      url = buildAuthorizationUrl(stored.clientId, [CALENDAR_WRITE_SCOPE]);
    } catch (e) {
      setError(`Could not build the Google authorization URL: ${(e as Error).message}`);
      return;
    }
    setAwaitingPaste(true);
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      setError("Browser blocked the popup. Copy the URL manually: " + url);
    }
  }, []);

  const onExchange = useCallback(async () => {
    const creds = readCredentials();
    if (!creds) {
      setError("Save Client ID + Secret first.");
      return;
    }
    const code = parseAuthorizationCode(paste);
    if (!code) {
      setError("Could not find a `code=…` in the pasted URL.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await exchangeCodeForTokens(creds, code);
      refreshState();
      setPaste("");
      setAwaitingPaste(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [paste, refreshState]);

  if (granted) {
    return (
      <p className="rounded-lg bg-emerald-500/[0.06] px-3 py-2 text-[12px] leading-relaxed text-emerald-200/85">
        Calendar write enabled — Operator can move an event once you approve it.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-amber-500/[0.05] px-3 py-2.5">
      <p className="text-[12px] leading-relaxed text-amber-200/85">
        Calendar write isn&apos;t enabled. Operator can detect conflicts but
        can&apos;t move events for you until you grant this — a separate,
        explicit consent from the read-only connection above.
      </p>
      {!awaitingPaste ? (
        <button
          type="button"
          onClick={onOpenConsent}
          className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/[0.08] px-3 py-1.5 text-[11.5px] font-medium text-white transition hover:bg-white/[0.12]"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Grant Calendar write access
        </button>
      ) : (
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={`${REDIRECT_URI}?code=…`}
            spellCheck={false}
            className="flex-1 rounded-md bg-black/30 px-2 py-1.5 font-mono text-[11.5px] text-white placeholder:text-white/30 focus:outline-none"
          />
          <button
            type="button"
            onClick={onExchange}
            disabled={busy || !paste.trim()}
            className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-[11.5px] font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? <Loader className="h-3.5 w-3.5 animate-spin" /> : "Enable"}
          </button>
        </div>
      )}
      {error && <p className="text-[11px] text-rose-200">{error}</p>}
    </div>
  );
}

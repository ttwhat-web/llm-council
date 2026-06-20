"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  ExternalLink,
  Inbox,
  Link2,
  Mail,
  MessageCircle,
  Send,
  Trash2,
  X
} from "lucide-react";

/**
 * Connector Dock · honest external launchers.
 *
 * This dock does NOT pretend to embed Gmail / Outlook / WhatsApp / Telegram.
 * Those providers block iframe embedding via X-Frame-Options / CSP, and we
 * do not scrape, proxy, or ask for passwords. Each tile opens the official
 * provider in the user's default browser, exactly as if they typed the URL.
 *
 * Custom URL: try the provided link in a new tab. Recent links are kept
 * in localStorage so the operator can re-launch them with one click.
 *
 * No data is stored about messages, no credentials are touched, no
 * background polling. WORKS = the button opens the external app.
 * BLOCKED = the provider refuses to embed and we say so honestly.
 *
 * Status labels follow the project taxonomy:
 *   external  · always opens in default browser (WORKS · OPEN EXTERNAL)
 *   blocked   · iframe embedding refused by provider; external opener used
 *   planned   · adapter not yet wired; button disabled
 */

const STORAGE_OPEN = "promptready-os.connector-dock.open";
const STORAGE_RECENTS = "promptready-os.connector-dock.recents";

type ConnectorStatus = "external" | "blocked" | "planned";

interface Connector {
  id: string;
  label: string;
  url: string;
  status: ConnectorStatus;
  Icon: typeof Mail;
  hint: string;
}

const CONNECTORS: Connector[] = [
  {
    id: "gmail",
    label: "Gmail",
    url: "https://mail.google.com",
    status: "external",
    Icon: Mail,
    hint: "Opens mail.google.com · OAuth read API planned"
  },
  {
    id: "outlook",
    label: "Outlook",
    url: "https://outlook.live.com/mail/",
    status: "external",
    Icon: Inbox,
    hint: "Opens outlook.live.com · Microsoft Graph API planned"
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    url: "https://web.whatsapp.com",
    status: "external",
    Icon: MessageCircle,
    hint: "Opens web.whatsapp.com · Twilio / Meta API planned"
  },
  {
    id: "telegram",
    label: "Telegram",
    url: "https://web.telegram.org",
    status: "external",
    Icon: Send,
    hint: "Opens web.telegram.org · separate from bot bridge"
  }
];

const STATUS_PILL: Record<ConnectorStatus, string> = {
  external: "border-accent/30 bg-accent/[0.08] text-accent",
  blocked: "border-amber-400/30 bg-amber-500/[0.08] text-amber-200",
  planned: "border-white/10 bg-white/[0.03] text-white/45"
};

const STATUS_LABEL: Record<ConnectorStatus, string> = {
  external: "external",
  blocked: "blocked · external",
  planned: "Coming soon"
};

function loadBool(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw == null ? fallback : raw === "1";
  } catch {
    return fallback;
  }
}

function writeBool(key: string, value: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // ignore
  }
}

function loadRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_RECENTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((s) => typeof s === "string").slice(0, 8);
  } catch {
    // ignore
  }
  return [];
}

function writeRecents(list: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_RECENTS, JSON.stringify(list.slice(0, 8)));
  } catch {
    // ignore
  }
}

function openExternal(url: string) {
  if (!url || typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function ConnectorDock() {
  const [open, setOpen] = useState<boolean>(() => loadBool(STORAGE_OPEN, false));
  const [input, setInput] = useState<string>("");
  const [recents, setRecents] = useState<string[]>(() => loadRecents());

  useEffect(() => writeBool(STORAGE_OPEN, open), [open]);

  const addRecent = useCallback((url: string) => {
    if (!url) return;
    setRecents((prev) => {
      const next = [url, ...prev.filter((u) => u !== url)].slice(0, 8);
      writeRecents(next);
      return next;
    });
  }, []);

  const launch = useCallback(
    (url: string) => {
      openExternal(url);
      addRecent(url);
    },
    [addRecent]
  );

  const onSubmitCustom = useCallback(() => {
    const url = input.trim();
    if (!url) return;
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    launch(normalized);
    setInput("");
  }, [input, launch]);

  const clearRecents = useCallback(() => {
    setRecents([]);
    writeRecents([]);
  }, []);

  const formattedRecents = useMemo(
    () =>
      recents.map((url) => {
        let host = url;
        try {
          host = new URL(url).host;
        } catch {
          // ignore
        }
        return { url, host };
      }),
    [recents]
  );

  // Launcher chip when collapsed.
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Connector Dock · open external apps"
        aria-label="Open Connector Dock · WORKS"
        className="no-drag fixed bottom-5 right-[110px] z-40 inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/70 px-3.5 py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/75 shadow-lg backdrop-blur-xl transition hover:border-accent/40 hover:text-accent"
      >
        <Link2 className="h-4 w-4 text-accent" />
        connect
      </button>
    );
  }

  return (
    <section
      className="no-drag fixed bottom-5 right-[110px] z-40 flex w-[340px] max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-2xl border border-white/12 bg-black/80 p-4 text-white shadow-2xl backdrop-blur-2xl"
      aria-label="Connector Dock"
    >
      {/* header */}
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-accent" />
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold">Connector Dock</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/40">
              external openers · no scraping · no passwords
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          title="Close dock"
          aria-label="Close Connector Dock · WORKS"
          className="rounded-md border border-white/10 bg-white/[0.03] p-1 text-white/55 transition hover:bg-white/[0.07] hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      {/* connector tiles */}
      <ul className="grid grid-cols-2 gap-1.5">
        {CONNECTORS.map((c) => {
          const disabled = c.status === "planned";
          return (
            <li key={c.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => launch(c.url)}
                title={c.hint}
                aria-label={`Open ${c.label} · OPEN EXTERNAL`}
                className={clsx(
                  "flex w-full items-center justify-between gap-1.5 rounded-lg border px-2 py-2 text-left transition",
                  disabled
                    ? "cursor-not-allowed border-white/8 bg-white/[0.012] opacity-50"
                    : "border-white/10 bg-white/[0.03] hover:border-accent/40 hover:bg-accent/[0.08]"
                )}
              >
                <span className="flex items-center gap-1.5">
                  <c.Icon className="h-3.5 w-3.5 text-accent" />
                  <span className="text-[12px] font-medium text-white">{c.label}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span
                    className={clsx(
                      "rounded border px-1 py-px font-mono text-[8px] uppercase tracking-wider",
                      STATUS_PILL[c.status]
                    )}
                  >
                    {STATUS_LABEL[c.status]}
                  </span>
                  {!disabled && <ExternalLink className="h-3 w-3 text-white/45" />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* custom URL row */}
      <div className="flex items-center gap-1.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmitCustom();
          }}
          placeholder="paste URL · opens in browser"
          aria-label="Custom URL · opens external"
          className="no-drag min-w-0 flex-1 rounded-md border border-white/8 bg-white/[0.025] px-2 py-1.5 text-[12px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
        />
        <button
          type="button"
          onClick={onSubmitCustom}
          disabled={!input.trim()}
          title="Open URL in new tab · OPEN EXTERNAL"
          aria-label="Open URL in new browser tab · OPEN EXTERNAL"
          className="inline-flex items-center gap-1 rounded-md border border-accent/40 bg-accent/[0.1] px-2 py-1.5 font-mono text-[9.5px] uppercase tracking-wider text-accent transition hover:bg-accent/[0.15] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ExternalLink className="h-3 w-3" />
          open
        </button>
      </div>

      {/* recents */}
      {formattedRecents.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">
              recent · {formattedRecents.length}
            </span>
            <button
              type="button"
              onClick={clearRecents}
              title="Clear recent · WORKS"
              aria-label="Clear recent connector links · WORKS"
              className="inline-flex items-center gap-1 rounded border border-white/8 bg-white/[0.025] px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-wider text-white/55 transition hover:bg-white/[0.05] hover:text-white"
            >
              <Trash2 className="h-2.5 w-2.5" />
              clear
            </button>
          </div>
          <ul className="flex flex-col gap-1">
            {formattedRecents.map((r) => (
              <li key={r.url}>
                <button
                  type="button"
                  onClick={() => launch(r.url)}
                  title={r.url}
                  aria-label={`Open recent ${r.host} · OPEN EXTERNAL`}
                  className="flex w-full items-center justify-between gap-1.5 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1 text-left font-mono text-[10px] text-white/70 transition hover:bg-white/[0.04] hover:text-white"
                >
                  <span className="truncate">{r.host}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 text-white/35" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* honest footer */}
      <p
        className="rounded-md border border-dashed border-white/8 bg-white/[0.012] px-2 py-1.5 font-mono text-[9px] uppercase tracking-wider text-white/45"
        role="note"
      >
        gmail · outlook · whatsapp · telegram refuse iframe embeds.
        each tile opens the official web app in your default browser.
        no credentials touched.
      </p>
    </section>
  );
}

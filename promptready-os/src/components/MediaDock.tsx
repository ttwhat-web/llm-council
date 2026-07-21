"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  AppWindow,
  ExternalLink,
  LineChart,
  Link2,
  Mail,
  MessageCircle,
  Plus,
  Send,
  Trash2,
  X,
  Youtube,
  type LucideIcon
} from "lucide-react";

const STORAGE_OPEN = "promptready-os.app-dock.open";
const STORAGE_RECENTS = "promptready-os.app-dock.recents";
const MAX_RECENTS = 10;

export interface WebAppLauncher {
  id: string;
  name: string;
  buttonLabel: string;
  url: string;
  Icon: LucideIcon;
  note: string;
}

interface RecentApp {
  id: string;
  name: string;
  url: string;
  openedAt: number;
}

export const WEB_APP_LAUNCHERS: WebAppLauncher[] = [
  {
    id: "gmail",
    name: "Gmail",
    buttonLabel: "Open Gmail",
    url: "https://mail.google.com",
    Icon: Mail,
    note: "Google blocks iframe embedding; opens the official web app."
  },
  {
    id: "whatsapp",
    name: "WhatsApp Web",
    buttonLabel: "Open WhatsApp Web",
    url: "https://web.whatsapp.com",
    Icon: MessageCircle,
    note: "QR login stays in the browser/app window you open."
  },
  {
    id: "telegram",
    name: "Telegram Web",
    buttonLabel: "Open Telegram Web",
    url: "https://web.telegram.org",
    Icon: Send,
    note: "External web app; separate from the bot bridge settings."
  },
  {
    id: "youtube",
    name: "YouTube",
    buttonLabel: "Open YouTube",
    url: "https://www.youtube.com",
    Icon: Youtube,
    note: "Opens YouTube directly; no tiny embedded player."
  },
  {
    id: "tradingview",
    name: "TradingView",
    buttonLabel: "Open TradingView",
    url: "https://www.tradingview.com/chart/",
    Icon: LineChart,
    note: "External charting workspace; Market Lab keeps its own canvas engine."
  }
];

function readBool(key: string, fallback: boolean): boolean {
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
    // localStorage can be unavailable in private/browser-restricted contexts.
  }
}

function readRecents(): RecentApp[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_RECENTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is RecentApp =>
          item &&
          typeof item.id === "string" &&
          typeof item.name === "string" &&
          typeof item.url === "string" &&
          typeof item.openedAt === "number"
      )
      .slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

function writeRecents(recents: RecentApp[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_RECENTS, JSON.stringify(recents.slice(0, MAX_RECENTS)));
  } catch {
    // ignore
  }
}

function normalizeUrl(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function labelForUrl(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function openExternal(url: string) {
  if (typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function MediaDock() {
  const [open, setOpen] = useState<boolean>(() => readBool(STORAGE_OPEN, false));

  useEffect(() => writeBool(STORAGE_OPEN, open), [open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Open App Dock · WORKS"
        aria-label="Open App Dock · WORKS"
        className="no-drag fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/75 px-3.5 py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/75 shadow-lg backdrop-blur-xl transition hover:border-accent/40 hover:bg-black/85 hover:text-accent"
      >
        <AppWindow className="h-4 w-4 text-accent" />
        apps
      </button>
    );
  }

  return (
    <WebAppsPanel
      floating
      onClose={() => setOpen(false)}
      className="fixed bottom-5 right-5 z-40 w-[380px] max-w-[calc(100vw-2rem)] shadow-2xl"
    />
  );
}

export function WebAppsPanel({
  floating = false,
  onClose,
  className
}: {
  floating?: boolean;
  onClose?: () => void;
  className?: string;
}) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recents, setRecents] = useState<RecentApp[]>(() => readRecents());

  const addRecent = useCallback((name: string, url: string) => {
    setRecents((prev) => {
      const next = [
        { id: `${name}:${url}`, name, url, openedAt: Date.now() },
        ...prev.filter((item) => item.url !== url)
      ].slice(0, MAX_RECENTS);
      writeRecents(next);
      return next;
    });
  }, []);

  const launch = useCallback(
    (name: string, url: string) => {
      openExternal(url);
      addRecent(name, url);
      setError(null);
    },
    [addRecent]
  );

  const addCustom = useCallback(() => {
    const url = normalizeUrl(input);
    if (!url) {
      setError("Enter a valid http or https URL.");
      return;
    }
    launch(labelForUrl(url), url);
    setInput("");
  }, [input, launch]);

  const clearRecents = useCallback(() => {
    setRecents([]);
    writeRecents([]);
  }, []);

  const formattedRecents = useMemo(
    () =>
      recents.map((item) => ({
        ...item,
        host: labelForUrl(item.url),
        time: new Date(item.openedAt).toLocaleTimeString("en-GB", { hour12: false })
      })),
    [recents]
  );

  const inputEmpty = input.trim().length === 0;

  return (
    <section
      aria-label="App Dock"
      className={clsx(
        "no-drag flex min-w-0 max-w-full flex-col gap-3 overflow-hidden rounded-lg border border-white/12 bg-[#05070d]/95 p-3 text-white backdrop-blur-2xl",
        floating ? "max-h-[min(720px,calc(100vh-2.5rem))] overflow-y-auto overflow-x-hidden scrollbar-thin" : "w-full",
        className
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <AppWindow className="mt-0.5 h-4 w-4 text-accent" />
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold text-white">App Dock</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/42">
              web apps · external windows/tabs · no iframe tricks
            </span>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            title="Close App Dock · WORKS"
            aria-label="Close App Dock · WORKS"
            className="rounded-md border border-white/10 bg-white/[0.03] p-1 text-white/55 transition hover:bg-white/[0.07] hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </header>

      <div className="rounded-md border border-amber-400/22 bg-amber-500/[0.055] px-2 py-1.5 font-mono text-[9.5px] uppercase tracking-wider text-amber-100/85">
        login stays in the browser/app window you open · no Gmail, WhatsApp, or Telegram iframes · no credentials stored
      </div>

      <ul className="grid min-w-0 grid-cols-1 gap-1.5 sm:grid-cols-2">
        {WEB_APP_LAUNCHERS.map((app) => (
          <li key={app.id}>
            <button
              type="button"
              onClick={() => launch(app.name, app.url)}
              title={`${app.buttonLabel} · WORKS · ${app.note}`}
              aria-label={`${app.buttonLabel} · WORKS`}
              className="flex h-full w-full min-w-0 items-start justify-between gap-2 rounded-md border border-white/10 bg-white/[0.025] px-2 py-2 text-left transition hover:border-accent/35 hover:bg-accent/[0.075]"
            >
              <span className="flex min-w-0 items-start gap-2">
                <app.Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                <span className="flex min-w-0 flex-col">
                  <span className="text-[12px] font-medium text-white">{app.buttonLabel}</span>
                  <span className="line-clamp-2 text-[10px] leading-snug text-white/48">{app.note}</span>
                </span>
              </span>
              <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-white/35" />
            </button>
          </li>
        ))}
      </ul>

      <form
        className="flex flex-col gap-1.5 rounded-md border border-white/8 bg-white/[0.018] p-2"
        onSubmit={(e) => {
          e.preventDefault();
          addCustom();
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/42">
            custom web app
          </span>
          <div className="flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5 text-white/35" />
            <input
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError(null);
              }}
              placeholder="app.example.com"
              aria-label="Custom web app URL"
              className="min-w-0 flex-1 rounded border border-white/10 bg-black/35 px-2 py-1.5 font-mono text-[11px] text-white placeholder:text-white/28 focus:border-accent/40 focus:outline-none"
            />
          </div>
        </label>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <span className="min-w-0 font-mono text-[9px] uppercase tracking-wider text-white/35">
            http/https only · saved to recents after opening
          </span>
          <button
            type="submit"
            disabled={inputEmpty}
            title={
              inputEmpty
                ? "Add custom web app URL · DISABLED · enter a URL"
                : "Add custom web app URL · WORKS"
            }
            aria-label={
              inputEmpty
                ? "Add custom web app URL · DISABLED · enter a URL"
                : "Add custom web app URL · WORKS"
            }
            className="inline-flex max-w-full shrink-0 items-center gap-1 whitespace-normal rounded-md border border-accent/40 bg-accent/[0.1] px-2 py-1 text-left font-mono text-[9.5px] uppercase leading-tight tracking-wider text-accent transition hover:bg-accent/[0.15] disabled:cursor-not-allowed disabled:border-white/8 disabled:bg-white/[0.012] disabled:text-white/38"
          >
            <Plus className="h-3 w-3" />
            add custom web app URL
          </button>
        </div>
        {error && (
          <div
            role="alert"
            className="rounded border border-rose-400/30 bg-rose-500/[0.06] px-2 py-1 font-mono text-[10px] text-rose-200"
          >
            {error}
          </div>
        )}
      </form>

      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/42">
            recent apps · {formattedRecents.length}
          </span>
          <button
            type="button"
            onClick={clearRecents}
            disabled={formattedRecents.length === 0}
            title={
              formattedRecents.length === 0
                ? "Clear recent apps · DISABLED · no recent apps"
                : "Clear recent apps · WORKS"
            }
            aria-label={
              formattedRecents.length === 0
                ? "Clear recent apps · DISABLED · no recent apps"
                : "Clear recent apps · WORKS"
            }
            className="inline-flex items-center gap-1 rounded border border-white/8 bg-white/[0.025] px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-wider text-white/55 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-2.5 w-2.5" />
            clear
          </button>
        </div>

        {formattedRecents.length === 0 ? (
          <div className="rounded-md border border-dashed border-white/10 bg-white/[0.012] px-2 py-2 font-mono text-[9.5px] uppercase tracking-wider text-white/38">
            no recent apps yet · open a web app to pin it here locally
          </div>
        ) : (
          <ul className="grid min-w-0 grid-cols-1 gap-1.5">
            {formattedRecents.map((app) => (
              <li key={`${app.url}:${app.openedAt}`}>
                <button
                  type="button"
                  onClick={() => launch(app.name, app.url)}
                  title={`Open ${app.name} · WORKS · ${app.url}`}
                  aria-label={`Open ${app.name} · WORKS`}
                  className="flex w-full min-w-0 items-center justify-between gap-2 rounded-md border border-white/8 bg-white/[0.014] px-2 py-1.5 text-left transition hover:border-white/18 hover:bg-white/[0.045]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[11.5px] font-medium text-white/82">
                      {app.name}
                    </span>
                    <span className="block truncate font-mono text-[9px] uppercase tracking-wider text-white/36">
                      {app.host} · {app.time}
                    </span>
                  </span>
                  <ExternalLink className="h-3 w-3 shrink-0 text-white/35" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

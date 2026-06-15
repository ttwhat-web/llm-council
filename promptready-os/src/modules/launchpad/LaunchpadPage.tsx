"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ExternalLink,
  Globe,
  LineChart,
  Mail,
  MessageCircle,
  QrCode,
  Send,
  ShieldCheck,
  StickyNote,
  Youtube
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Launchpad · external web-tool launcher.
 *
 * Two groups: Tools (YouTube, TradingView, Notion, custom URL) and
 * Communications (Gmail, WhatsApp Web, Telegram Web). Every tile
 * opens an official browser tab. Operator.Center does not read or
 * control anything inside these tabs.
 */

interface Tile {
  id: string;
  name: string;
  url: string;
  Icon: LucideIcon;
  reason: string;
}

const TOOL_TILES: Tile[] = [
  {
    id: "youtube",
    name: "YouTube",
    url: "https://www.youtube.com",
    Icon: Youtube,
    reason: "Long-form research and tutorials."
  },
  {
    id: "tradingview",
    name: "TradingView",
    url: "https://www.tradingview.com/chart/",
    Icon: LineChart,
    reason: "Full charting workspace and watchlists."
  },
  {
    id: "notion",
    name: "Notion",
    url: "https://www.notion.so",
    Icon: StickyNote,
    reason: "Your personal docs and project pages."
  }
];

const COMMS_TILES: Tile[] = [
  {
    id: "gmail",
    name: "Gmail",
    url: "https://mail.google.com",
    Icon: Mail,
    reason: "Mailbox in the official Gmail web app."
  },
  {
    id: "whatsapp",
    name: "WhatsApp Web",
    url: "https://web.whatsapp.com",
    Icon: MessageCircle,
    reason: "Scan the QR once and the tab stays signed in."
  },
  {
    id: "telegram",
    name: "Telegram Web",
    url: "https://web.telegram.org",
    Icon: Send,
    reason: "Scan the QR once and the tab stays signed in."
  }
];

const RECENTS_KEY = "promptready-os.launchpad.recents";

interface Recent {
  url: string;
  name: string;
  at: number;
}

function readRecents(): Recent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((r) => r && typeof r.url === "string").slice(0, 8) : [];
  } catch {
    return [];
  }
}

function writeRecents(list: Recent[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(list.slice(0, 8)));
  } catch {
    /* ignore quota errors */
  }
}

function hostnameOf(raw: string): string {
  try {
    return new URL(raw).hostname.replace(/^www\./, "");
  } catch {
    return raw;
  }
}

function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export default function LaunchpadPage() {
  const [customUrl, setCustomUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recents, setRecents] = useState<Recent[]>(() => readRecents());

  const launch = useCallback((name: string, url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
    setRecents((prev) => {
      const next = [{ name, url, at: Date.now() }, ...prev.filter((r) => r.url !== url)].slice(0, 8);
      writeRecents(next);
      return next;
    });
  }, []);

  const onSubmitCustom = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const normalized = normalizeUrl(customUrl);
      if (!normalized) {
        setError("Enter a valid https:// URL.");
        return;
      }
      setError(null);
      launch(hostnameOf(normalized), normalized);
      setCustomUrl("");
    },
    [customUrl, launch]
  );

  const recentTiles = useMemo(() => recents.slice(0, 6), [recents]);

  return (
    <div className="mx-auto flex h-full w-full max-w-[1100px] min-w-0 flex-col gap-6 overflow-y-auto overflow-x-hidden px-6 py-6">
      <header className="flex max-w-full min-w-0 flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-accent/85">launchpad</span>
          <h1 className="text-[24px] font-semibold leading-tight text-white">Launchpad</h1>
          <p className="max-w-2xl text-[13px] leading-relaxed text-white/60">
            One click opens an official web tool in a new tab. Operator.Center does not embed, proxy, or read anything inside these tabs.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/[0.05] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-200">
          <ShieldCheck className="h-3 w-3" /> external only · no credentials stored
        </span>
      </header>

      <Section
        eyebrow="tools"
        title="External tools"
        sub="Research, charts, notes. Each tile opens externally; we never embed or intercept these apps."
      >
        <TileGrid tiles={TOOL_TILES} onLaunch={launch} />
      </Section>

      <Section
        eyebrow="communications"
        title="Communications"
        sub="Gmail, WhatsApp Web, and Telegram Web open in their official web apps. Juan does not read messages unless a connector is added later."
      >
        <TileGrid tiles={COMMS_TILES} onLaunch={launch} />
        <div className="mt-1 flex items-start gap-2 rounded-lg border border-white/8 bg-white/[0.018] px-3 py-2">
          <QrCode className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-200/85" />
          <p className="text-[12px] leading-relaxed text-white/70">
            <span className="font-medium text-white/85">QR login</span> · WhatsApp Web and Telegram Web ask you to scan a code from your phone the first time. Leave the tab open and the session stays signed in until your phone signs it out.
          </p>
        </div>
      </Section>

      <Section
        eyebrow="custom"
        title="Open any website"
        sub="Paste any https:// URL. We save it to recents on this device only."
      >
        <form onSubmit={onSubmitCustom} className="flex min-w-0 items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 focus-within:border-accent/40">
            <Globe className="h-3.5 w-3.5 shrink-0 text-white/45" />
            <input
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://example.com"
              aria-label="Custom URL"
              className="no-drag min-w-0 flex-1 bg-transparent text-[13px] text-white placeholder:text-white/30 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent/90 px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-accent"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open externally
          </button>
        </form>
        {error && <p className="text-[11.5px] text-rose-300">{error}</p>}
        {recentTiles.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/45">recents</span>
            {recentTiles.map((r) => (
              <button
                key={r.url}
                type="button"
                onClick={() => launch(r.name, r.url)}
                className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/[0.02] px-2.5 py-0.5 text-[11px] text-white/75 transition hover:border-white/15 hover:bg-white/[0.05] hover:text-white"
              >
                {r.name}
              </button>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  sub,
  children
}: {
  eyebrow: string;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <header className="flex min-w-0 flex-col gap-0.5">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.28em] text-white/40">{eyebrow}</span>
        <h2 className="text-[15px] font-semibold text-white">{title}</h2>
        <p className="max-w-2xl text-[12px] leading-relaxed text-white/55">{sub}</p>
      </header>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function TileGrid({ tiles, onLaunch }: { tiles: Tile[]; onLaunch: (name: string, url: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {tiles.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onLaunch(t.name, t.url)}
          className="group flex min-w-0 items-center gap-3 rounded-xl border border-white/8 bg-white/[0.012] px-3.5 py-3 text-left transition hover:border-white/18 hover:bg-white/[0.035]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/8 bg-white/[0.03] text-white/85 group-hover:text-accent">
            <t.Icon className="h-4 w-4" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex min-w-0 items-center justify-between gap-2">
              <span className="truncate text-[13px] font-medium text-white">{t.name}</span>
              <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.2em] text-white/40 group-hover:text-white/65">opens externally</span>
            </span>
            <span className="truncate text-[11.5px] text-white/55">{t.reason}</span>
          </span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-white/35 group-hover:text-accent" />
        </button>
      ))}
    </div>
  );
}

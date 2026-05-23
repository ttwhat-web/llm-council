"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  ExternalLink,
  Headphones,
  Music2,
  PictureInPicture2,
  Play,
  Radio,
  Search,
  Sparkles,
  StopCircle,
  Tv,
  X
} from "lucide-react";

/**
 * Media Dock · floating, user-driven only.
 *
 * A small launcher fixed bottom-right toggles a glass panel that plays ONLY
 * media the operator explicitly pastes or clicks. Nothing auto-loads, nothing
 * is embedded on our behalf, no proprietary feeds, no broadcast TV.
 *
 * Source TABS pick the public search target + the suggested preset chips:
 *   - YouTube       · search opens youtube.com/results in a new tab
 *   - Spotify       · search opens open.spotify.com/search
 *   - Apple Music   · search opens music.apple.com/search
 *   - Custom URL    · just opens whatever the operator typed in a new tab
 *
 * Pasted URLs resolve client-side to a SANDBOXED embed when the source is
 * recognised (youtube-nocookie iframe, Spotify embed, Apple Music embed) or
 * a native <audio> element for direct files. Everything else degrades to an
 * "open in browser" button — we never scrape, we never proxy.
 *
 * Mode chips are LABELS only · they preselect a tab + show suggested public
 * preset URLs (small chips the operator clicks). "Market TV" is purely a
 * label · there is no TV stream of any kind.
 *
 * State (open + last source + tab + mode + size) persists to localStorage
 * under keys prefixed "promptready-os.media-dock."; default is CLOSED and
 * EMPTY. Self-contained — no store, route, or layout edits required.
 */

// ---------------------------------------------------------------------------
// constants
// ---------------------------------------------------------------------------

const STORAGE_PREFIX = "promptready-os.media-dock.";
const K_OPEN = `${STORAGE_PREFIX}open`;
const K_TAB = `${STORAGE_PREFIX}tab`;
const K_MODE = `${STORAGE_PREFIX}mode`;
const K_SIZE = `${STORAGE_PREFIX}size`;
const K_INPUT = `${STORAGE_PREFIX}last-input`;

type Tab = "youtube" | "spotify" | "apple" | "custom";
type Mode = "focus" | "market" | "radio" | "youtube" | "custom";
type Size = "mini" | "medium" | "large";

interface LoadedYouTube {
  kind: "youtube";
  url: string;
  src: string;
  label: string;
}
interface LoadedSpotify {
  kind: "spotify";
  url: string;
  src: string;
  label: string;
}
interface LoadedApple {
  kind: "apple";
  url: string;
  src: string;
  label: string;
}
interface LoadedAudio {
  kind: "audio";
  url: string;
  src: string;
  label: string;
}
interface LoadedExternal {
  kind: "external";
  url: string;
  src: string;
  label: string;
}
type Loaded = LoadedYouTube | LoadedSpotify | LoadedApple | LoadedAudio | LoadedExternal;

interface Preset {
  label: string;
  url: string;
}

/** Suggested PUBLIC URLs per mode · operator must click to load (no autoplay). */
const PRESETS: Record<Mode, Preset[]> = {
  focus: [
    { label: "Lofi beats (YouTube)", url: "https://www.youtube.com/watch?v=jfKfPfyJRdk" },
    { label: "Deep focus (YouTube)", url: "https://www.youtube.com/watch?v=lTRiuFIWV54" }
  ],
  market: [
    // "Market TV" is a LABEL ONLY. No live TV stream — operator pastes whatever
    // public audio/video commentary they want, or uses the data wall.
    { label: "Paste your own commentary URL", url: "" }
  ],
  radio: [
    { label: "Chillhop radio (YouTube)", url: "https://www.youtube.com/watch?v=5yx6BWlEVcY" }
  ],
  youtube: [
    { label: "Lofi beats", url: "https://www.youtube.com/watch?v=jfKfPfyJRdk" },
    { label: "Deep focus", url: "https://www.youtube.com/watch?v=lTRiuFIWV54" }
  ],
  custom: []
};

/** Each mode pre-selects a source tab. */
const MODE_TAB: Record<Mode, Tab> = {
  focus: "youtube",
  market: "custom",
  radio: "youtube",
  youtube: "youtube",
  custom: "custom"
};

const MODES: Array<{ id: Mode; label: string; Icon: typeof Radio }> = [
  { id: "focus", label: "Focus Music", Icon: Headphones },
  { id: "market", label: "Market TV", Icon: Tv },
  { id: "radio", label: "Radio", Icon: Radio },
  { id: "youtube", label: "YouTube", Icon: Play },
  { id: "custom", label: "Custom", Icon: ExternalLink }
];

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "youtube", label: "YouTube" },
  { id: "spotify", label: "Spotify" },
  { id: "apple", label: "Apple Music" },
  { id: "custom", label: "Custom URL" }
];

const SIZES: Array<{ id: Size; label: string; w: number; h: number }> = [
  { id: "mini", label: "mini", w: 280, h: 170 },
  { id: "medium", label: "medium", w: 380, h: 260 },
  { id: "large", label: "large", w: 560, h: 360 }
];

const AUDIO_RE = /\.(mp3|m4a|ogg|oga|opus|wav|aac)(\?.*)?$/i;

// ---------------------------------------------------------------------------
// component
// ---------------------------------------------------------------------------

export function MediaDock() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("youtube");
  const [mode, setMode] = useState<Mode>("focus");
  const [size, setSize] = useState<Size>("medium");
  const [input, setInput] = useState("");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [pipSupported, setPipSupported] = useState(false);

  const mediaRef = useRef<HTMLVideoElement | null>(null);

  // Hydrate persisted state once. Default: closed + empty.
  useEffect(() => {
    setOpen(readBool(K_OPEN, false));
    setTab(readEnum<Tab>(K_TAB, ["youtube", "spotify", "apple", "custom"], "youtube"));
    setMode(readEnum<Mode>(K_MODE, ["focus", "market", "radio", "youtube", "custom"], "focus"));
    setSize(readEnum<Size>(K_SIZE, ["mini", "medium", "large"], "medium"));
    const last = readString(K_INPUT);
    if (last) setInput(last);
  }, []);

  // Persist each piece independently · each key prefixed.
  useEffect(() => writeBool(K_OPEN, open), [open]);
  useEffect(() => writeString(K_TAB, tab), [tab]);
  useEffect(() => writeString(K_MODE, mode), [mode]);
  useEffect(() => writeString(K_SIZE, size), [size]);
  useEffect(() => writeString(K_INPUT, input.trim()), [input]);

  // Feature-detect Picture-in-Picture (native media path only).
  useEffect(() => {
    if (typeof document === "undefined") return;
    setPipSupported(
      typeof document.exitPictureInPicture === "function" && !!document.pictureInPictureEnabled
    );
  }, []);

  // ----- load + clear ------------------------------------------------------

  const load = useCallback((rawUrl: string, label?: string) => {
    const url = rawUrl.trim();
    if (!url) return;

    const yt = parseYouTubeId(url);
    if (yt) {
      setLoaded({
        kind: "youtube",
        url,
        src: `https://www.youtube-nocookie.com/embed/${yt}`,
        label: label ?? "YouTube"
      });
      return;
    }

    if (AUDIO_RE.test(url)) {
      setLoaded({ kind: "audio", url, src: url, label: label ?? "Audio file" });
      return;
    }

    const sp = parseSpotify(url);
    if (sp) {
      setLoaded({
        kind: "spotify",
        url,
        src: `https://open.spotify.com/embed/${sp.type}/${sp.id}`,
        label: label ?? `Spotify ${sp.type}`
      });
      return;
    }

    const ap = parseAppleMusic(url);
    if (ap) {
      setLoaded({ kind: "apple", url, src: ap, label: label ?? "Apple Music" });
      return;
    }

    setLoaded({ kind: "external", url, src: url, label: label ?? "External link" });
  }, []);

  const loadFromInput = useCallback(() => load(input), [input, load]);

  const loadPreset = useCallback(
    (p: Preset) => {
      if (!p.url) return;
      setInput(p.url);
      load(p.url, p.label);
    },
    [load]
  );

  const clear = useCallback(() => {
    const el = mediaRef.current;
    if (el) {
      try {
        el.pause();
      } catch {
        // ignore
      }
      el.removeAttribute("src");
      try {
        el.load();
      } catch {
        // ignore
      }
    }
    if (
      typeof document !== "undefined" &&
      document.pictureInPictureElement &&
      typeof document.exitPictureInPicture === "function"
    ) {
      void document.exitPictureInPicture().catch(() => undefined);
    }
    setLoaded(null);
  }, []);

  const enterPip = useCallback(() => {
    const el = mediaRef.current;
    if (!el || typeof el.requestPictureInPicture !== "function") return;
    void el.requestPictureInPicture().catch(() => undefined);
  }, []);

  // ----- mode + tab + search ----------------------------------------------

  const onPickMode = useCallback((m: Mode) => {
    setMode(m);
    setTab(MODE_TAB[m]);
  }, []);

  const openExternalSearch = useCallback(() => {
    const q = input.trim();
    if (!q) return;
    const target = buildSearchUrl(tab, q);
    if (!target) return;
    if (typeof window !== "undefined") {
      window.open(target, "_blank", "noopener,noreferrer");
    }
  }, [input, tab]);

  const openExternalUrl = useCallback((url: string) => {
    if (!url) return;
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }, []);

  // ----- derived ----------------------------------------------------------

  const presets = useMemo(() => PRESETS[mode], [mode]);
  const sizeDef = useMemo(() => SIZES.find((s) => s.id === size) ?? SIZES[1], [size]);
  // PiP only meaningful for the native media element path. Iframes can't PiP.
  const pipAvailable = pipSupported && loaded?.kind === "audio";
  const searchAriaLabel = useMemo(() => searchAria(tab), [tab]);

  // ----- launcher ---------------------------------------------------------

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Media Dock · user-selected media only"
        aria-label="Open Media Dock · WORKS"
        className="no-drag fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/70 px-3.5 py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/75 shadow-lg backdrop-blur-xl transition hover:border-accent/40 hover:text-accent"
      >
        <Music2 className="h-4 w-4 text-accent" />
        media
      </button>
    );
  }

  // ----- panel ------------------------------------------------------------

  return (
    <section
      className="no-drag fixed bottom-5 right-5 z-40 flex max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-2xl border border-white/12 bg-black/80 p-4 text-white shadow-2xl backdrop-blur-2xl"
      style={{ width: sizeDef.w + 32 }}
    >
      {/* header */}
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Music2 className="h-4 w-4 text-accent" />
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold">Media Dock</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/40">
              user-selected media only
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* size selector */}
          <div className="flex items-center gap-0.5 rounded-md border border-white/10 bg-white/[0.03] p-0.5">
            {SIZES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSize(s.id)}
                title={`Size ${s.label} · ${s.w}×${s.h}`}
                aria-label={`Set dock size ${s.label} · WORKS`}
                className={clsx(
                  "rounded px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-wider transition",
                  size === s.id ? "bg-accent/[0.18] text-accent" : "text-white/55 hover:bg-white/[0.07]"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            title="Close dock"
            aria-label="Close Media Dock · WORKS"
            className="rounded-md border border-white/10 bg-white/[0.03] p-1 text-white/55 transition hover:bg-white/[0.07] hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* source tabs */}
      <div role="tablist" aria-label="Media source" className="flex items-center gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            title={`${t.label} source · WORKS`}
            className={clsx(
              "rounded border px-2 py-1 font-mono text-[9px] uppercase tracking-wider transition",
              tab === t.id
                ? "border-accent/40 bg-accent/[0.08] text-accent"
                : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* mode chips · LABELS only · preselect tab + show suggested presets */}
      <div className="flex flex-wrap items-center gap-1">
        {MODES.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onPickMode(id)}
            title={`${label} · label only · suggests presets · WORKS`}
            aria-label={`Select ${label} mode · WORKS`}
            className={clsx(
              "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider transition",
              id === mode
                ? "border-accent/40 bg-accent/[0.08] text-accent"
                : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]"
            )}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}
      </div>

      {mode === "market" && (
        <p
          className="rounded-md border border-dashed border-amber-300/25 bg-amber-300/[0.04] px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-wider text-amber-200/80"
          role="note"
        >
          market tv · label only · data wall only · no live tv stream
        </p>
      )}

      {/* search + paste row */}
      <div className="flex items-center gap-1.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            // Custom URL tab · Enter loads the pasted URL.
            // Source tabs · Enter opens external search.
            if (tab === "custom") loadFromInput();
            else openExternalSearch();
          }}
          placeholder={inputPlaceholder(tab)}
          aria-label={`Search query or URL · ${tab}`}
          className="no-drag min-w-0 flex-1 rounded-md border border-white/8 bg-white/[0.025] px-2 py-1.5 text-[12px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
        />
        {tab === "custom" ? (
          <>
            <button
              type="button"
              onClick={loadFromInput}
              disabled={!input.trim()}
              title="Load pasted URL · WORKS"
              aria-label="Load pasted URL · WORKS"
              className="inline-flex items-center gap-1 rounded-md border border-accent/40 bg-accent/[0.1] px-2 py-1.5 font-mono text-[9.5px] uppercase tracking-wider text-accent transition hover:bg-accent/[0.15] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Play className="h-3 w-3" />
              load
            </button>
            <button
              type="button"
              onClick={() => openExternalUrl(input.trim())}
              disabled={!input.trim()}
              title="open external · OPEN EXTERNAL"
              aria-label="Open in new browser tab · OPEN EXTERNAL"
              className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5 font-mono text-[9.5px] uppercase tracking-wider text-white/65 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ExternalLink className="h-3 w-3" />
              open
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={openExternalSearch}
              disabled={!input.trim()}
              title="open external · OPEN EXTERNAL"
              aria-label={searchAriaLabel}
              className="inline-flex items-center gap-1 rounded-md border border-accent/40 bg-accent/[0.1] px-2 py-1.5 font-mono text-[9.5px] uppercase tracking-wider text-accent transition hover:bg-accent/[0.15] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Search className="h-3 w-3" />
              search
            </button>
            <button
              type="button"
              onClick={loadFromInput}
              disabled={!input.trim()}
              title="Load pasted URL · WORKS"
              aria-label="Load pasted URL · WORKS"
              className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5 font-mono text-[9.5px] uppercase tracking-wider text-white/65 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Play className="h-3 w-3" />
              load
            </button>
          </>
        )}
      </div>

      <p className="font-mono text-[8.5px] uppercase tracking-wider text-white/30">
        search opens an external browser tab · we never scrape results
      </p>

      {/* presets · suggested public URLs for the active mode */}
      {presets.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[8.5px] uppercase tracking-[0.22em] text-white/35">
            presets · click to load
          </span>
          <div className="flex flex-wrap items-center gap-1">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => loadPreset(p)}
                disabled={!p.url}
                title={p.url ? "Load preset · WORKS" : "Paste your own URL"}
                aria-label={p.url ? `Load preset ${p.label} · WORKS` : `${p.label} · DISABLED`}
                className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-white/65 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* player surface */}
      <div
        className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/40 p-2.5"
        style={{ minHeight: sizeDef.h }}
      >
        {!loaded ? (
          <p className="flex flex-1 items-center justify-center px-1 py-3 text-center font-mono text-[10px] uppercase tracking-wider text-white/35">
            nothing playing · paste a URL or pick a preset
          </p>
        ) : loaded.kind === "youtube" ? (
          <div className="overflow-hidden rounded-lg border border-white/10">
            <iframe
              key={loaded.src}
              title={loaded.label}
              src={loaded.src}
              style={{ width: sizeDef.w, height: sizeDef.h }}
              className="block max-w-full"
              sandbox="allow-scripts allow-same-origin allow-presentation"
              allow="encrypted-media; picture-in-picture"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : loaded.kind === "spotify" ? (
          <div className="overflow-hidden rounded-lg border border-white/10">
            <iframe
              key={loaded.src}
              title={loaded.label}
              src={loaded.src}
              style={{ width: sizeDef.w, height: sizeDef.h }}
              className="block max-w-full"
              sandbox="allow-scripts allow-same-origin allow-popups"
              allow="encrypted-media"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : loaded.kind === "apple" ? (
          <div className="overflow-hidden rounded-lg border border-white/10">
            <iframe
              key={loaded.src}
              title={loaded.label}
              src={loaded.src}
              style={{ width: sizeDef.w, height: sizeDef.h }}
              className="block max-w-full"
              sandbox="allow-scripts allow-same-origin allow-popups"
              allow="encrypted-media; autoplay *;"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : loaded.kind === "audio" ? (
          <video
            ref={mediaRef}
            src={loaded.src}
            controls
            preload="metadata"
            className="w-full"
            style={{ maxHeight: sizeDef.h }}
          />
        ) : (
          <div className="flex flex-col gap-2 px-1 py-2">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">
              external · cannot embed
            </p>
            <button
              type="button"
              onClick={() => openExternalUrl(loaded.url)}
              title="open external · OPEN EXTERNAL"
              aria-label="Open in browser · OPEN EXTERNAL"
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5 font-mono text-[9.5px] uppercase tracking-wider text-white/70 transition hover:bg-white/[0.06]"
            >
              <ExternalLink className="h-3 w-3" />
              open in browser
            </button>
          </div>
        )}

        {loaded && (
          <div className="flex items-center justify-between gap-2">
            <span
              className="min-w-0 flex-1 truncate font-mono text-[9px] uppercase tracking-wider text-white/40"
              title={loaded.url}
            >
              {loaded.label}
            </span>
            <div className="flex items-center gap-1">
              {pipAvailable ? (
                <button
                  type="button"
                  onClick={enterPip}
                  title="Picture-in-Picture · WORKS"
                  aria-label="Enter Picture-in-Picture · WORKS"
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-1 font-mono text-[9px] uppercase tracking-wider text-white/65 transition hover:bg-white/[0.06]"
                >
                  <PictureInPicture2 className="h-3 w-3" />
                  pip
                </button>
              ) : (
                <span
                  title="pip unavailable · only native audio/video supports PiP · DISABLED"
                  aria-label="Picture-in-Picture unavailable · DISABLED"
                  className="inline-flex items-center gap-1 rounded-md border border-white/8 bg-white/[0.02] px-1.5 py-1 font-mono text-[9px] uppercase tracking-wider text-white/30"
                >
                  <PictureInPicture2 className="h-3 w-3" />
                  pip unavailable
                </span>
              )}
              <button
                type="button"
                onClick={clear}
                title="Stop and clear · WORKS"
                aria-label="Stop and clear media · WORKS"
                className="inline-flex items-center gap-1 rounded-md border border-rose-400/30 bg-rose-500/[0.06] px-1.5 py-1 font-mono text-[9px] uppercase tracking-wider text-rose-200 transition hover:bg-rose-500/[0.12]"
              >
                <StopCircle className="h-3 w-3" />
                stop / clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* planned AI Radio Mode · disabled, future */}
      <div
        className="flex items-center gap-2 rounded-lg border border-dashed border-white/10 bg-white/[0.012] px-2.5 py-1.5 opacity-70"
        title="AI Radio Mode · planned · DISABLED"
        aria-label="AI Radio Mode · planned · DISABLED"
      >
        <Sparkles className="h-3.5 w-3.5 text-white/35" />
        <div className="flex flex-col">
          <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/45">
            AI Radio Mode
          </span>
          <span className="font-mono text-[8.5px] uppercase tracking-wider text-white/30">
            planned · Atlas narration of news / alerts / missions
          </span>
        </div>
      </div>

      <footer className="text-center font-mono text-[8.5px] uppercase tracking-wider text-white/30">
        no autoplay · no proprietary feeds · only what you load
      </footer>
    </section>
  );
}

// ---------------------------------------------------------------------------
// helpers · search + parsing
// ---------------------------------------------------------------------------

function buildSearchUrl(tab: Tab, q: string): string | null {
  const enc = encodeURIComponent(q);
  switch (tab) {
    case "youtube":
      return `https://www.youtube.com/results?search_query=${enc}`;
    case "spotify":
      return `https://open.spotify.com/search/${enc}`;
    case "apple":
      return `https://music.apple.com/search?term=${enc}`;
    case "custom":
      // For custom URL tab, the input IS the URL.
      return /^https?:\/\//i.test(q) ? q : null;
  }
}

function inputPlaceholder(tab: Tab): string {
  switch (tab) {
    case "youtube":
      return "Search YouTube or paste a watch/share URL";
    case "spotify":
      return "Search Spotify or paste an open.spotify.com URL";
    case "apple":
      return "Search Apple Music or paste a music.apple.com URL";
    case "custom":
      return "Paste any URL (audio file or external link)";
  }
}

function searchAria(tab: Tab): string {
  switch (tab) {
    case "youtube":
      return "Open YouTube search in new tab · OPEN EXTERNAL";
    case "spotify":
      return "Open Spotify search in new tab · OPEN EXTERNAL";
    case "apple":
      return "Open Apple Music search in new tab · OPEN EXTERNAL";
    case "custom":
      return "Open URL in new tab · OPEN EXTERNAL";
  }
}

/** Extract an 11-char YouTube video id from watch / youtu.be / embed URLs. */
function parseYouTubeId(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");
  const id = (() => {
    if (host === "youtu.be") return u.pathname.slice(1);
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      if (u.pathname === "/watch") return u.searchParams.get("v") ?? "";
      const m = u.pathname.match(/^\/embed\/([^/?]+)/);
      if (m) return m[1];
    }
    return "";
  })();
  return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
}

/** Extract Spotify {type,id} from open.spotify.com/{type}/{id}. */
function parseSpotify(url: string): { type: "track" | "playlist" | "album" | "episode" | "show"; id: string } | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");
  if (host !== "open.spotify.com") return null;
  const m = u.pathname.match(/^\/(track|playlist|album|episode|show)\/([A-Za-z0-9]+)/);
  if (!m) return null;
  return { type: m[1] as "track" | "playlist" | "album" | "episode" | "show", id: m[2] };
}

/**
 * Build an Apple Music embed URL from a music.apple.com link when easily
 * detectable (album / playlist / song paths). Otherwise return null so the
 * caller falls back to "open in browser".
 */
function parseAppleMusic(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");
  if (host !== "music.apple.com") return null;
  // Path shape:  /<locale>/(album|playlist|song)/<slug>/<id>
  if (!/\/(album|playlist|song)\//.test(u.pathname)) return null;
  return `https://embed.music.apple.com${u.pathname}${u.search}`;
}

// ---------------------------------------------------------------------------
// helpers · storage (each key independent, prefixed)
// ---------------------------------------------------------------------------

function readString(key: string): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeString(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore quota / privacy-mode failures
  }
}

function readBool(key: string, fallback: boolean): boolean {
  const raw = readString(key);
  if (raw === "1") return true;
  if (raw === "0") return false;
  return fallback;
}

function writeBool(key: string, value: boolean): void {
  writeString(key, value ? "1" : "0");
}

function readEnum<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  const raw = readString(key) as T;
  return (allowed as readonly string[]).includes(raw) ? raw : fallback;
}

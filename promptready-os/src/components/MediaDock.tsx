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
  Sparkles,
  StopCircle,
  TrendingUp,
  X
} from "lucide-react";

/**
 * Media Dock · floating, user-driven only.
 *
 * A small launcher fixed bottom-right toggles a glass panel that plays ONLY
 * media the operator explicitly pastes or clicks. Nothing auto-loads, nothing
 * is embedded on our behalf. YouTube watch/share/embed links resolve to the
 * official privacy-enhanced embed iframe; direct audio files play in a native
 * <video> element (also handles audio-only sources, and is the only element
 * the PiP spec supports); everything else opens in the browser (we never embed
 * arbitrary third-party sites). No proprietary feeds, no broadcast TV.
 *
 * State (open + last source) persists to localStorage; default is CLOSED and
 * EMPTY. Self-contained — no store, route, or layout edits required.
 */

const STORAGE_KEY = "promptready-os.media-dock";

type Mode = "focus" | "market" | "radio" | "pip";

type LoadedKind = "youtube" | "audio" | "external";

interface Loaded {
  kind: LoadedKind;
  /** Original user-supplied URL. */
  url: string;
  /** For youtube: the embed URL; for audio: the direct file URL. */
  src: string;
  label: string;
}

interface Persisted {
  open: boolean;
  lastUrl: string;
}

interface Preset {
  mode: Mode;
  label: string;
  url: string;
}

/**
 * Optional starting points the operator may CLICK to load. These are public,
 * generic streams — they are never auto-played, only loaded on an explicit
 * click. No proprietary/branded feeds.
 */
const PRESETS: Preset[] = [
  { mode: "focus", label: "Lofi beats", url: "https://www.youtube.com/watch?v=jfKfPfyJRdk" },
  { mode: "focus", label: "Deep focus", url: "https://www.youtube.com/watch?v=lTRiuFIWV54" },
  { mode: "radio", label: "Chillhop radio", url: "https://www.youtube.com/watch?v=5yx6BWlEVcY" },
  { mode: "market", label: "Ambient (paste your own)", url: "" }
];

const MODES: Array<{ id: Mode; label: string; Icon: typeof Radio }> = [
  { id: "focus", label: "Focus", Icon: Headphones },
  { id: "market", label: "Market", Icon: TrendingUp },
  { id: "radio", label: "Radio", Icon: Radio },
  { id: "pip", label: "Picture-in-Picture", Icon: PictureInPicture2 }
];

const AUDIO_RE = /\.(mp3|m4a|ogg|oga|wav|aac)(\?.*)?$/i;

export function MediaDock() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("focus");
  const [input, setInput] = useState("");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [pipSupported, setPipSupported] = useState(false);

  const audioRef = useRef<HTMLVideoElement | null>(null);

  // Hydrate persisted state once (open + last source). Default closed/empty.
  useEffect(() => {
    const p = readPersisted();
    if (!p) return;
    setOpen(p.open);
    if (p.lastUrl) setInput(p.lastUrl);
  }, []);

  // Persist open + last input (the source the operator last chose).
  useEffect(() => {
    writePersisted({ open, lastUrl: input.trim() });
  }, [open, input]);

  // Feature-detect Picture-in-Picture (audio/video element path only).
  useEffect(() => {
    if (typeof document === "undefined") return;
    setPipSupported(
      typeof document.exitPictureInPicture === "function" && !!document.pictureInPictureEnabled
    );
  }, []);

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
      setLoaded({ kind: "audio", url, src: url, label: label ?? "Audio" });
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
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.removeAttribute("src");
      el.load();
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
    const el = audioRef.current;
    if (!el || typeof el.requestPictureInPicture !== "function") return;
    void el.requestPictureInPicture().catch(() => undefined);
  }, []);

  const presetsForMode = useMemo(() => PRESETS.filter((p) => p.mode === mode), [mode]);

  // PiP is only meaningful for the native media element path. YouTube iframes
  // cannot be put into PiP, so we are honest about it.
  const pipAvailable = pipSupported && loaded?.kind === "audio";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Media Dock · user-selected media only"
        className="no-drag fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/70 px-3.5 py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/75 shadow-lg backdrop-blur-xl transition hover:border-accent/40 hover:text-accent"
      >
        <Music2 className="h-4 w-4 text-accent" />
        media
      </button>
    );
  }

  return (
    <section className="no-drag fixed bottom-5 right-5 z-40 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-2xl border border-white/12 bg-black/80 p-4 text-white shadow-2xl backdrop-blur-2xl">
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
        <button
          type="button"
          onClick={() => setOpen(false)}
          title="Close dock"
          className="rounded-md border border-white/10 bg-white/[0.03] p-1 text-white/55 transition hover:bg-white/[0.07] hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      {/* mode chips · organize presets only */}
      <div className="flex flex-wrap items-center gap-1">
        {MODES.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
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

      {/* paste / load */}
      <div className="flex items-center gap-1.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") loadFromInput();
          }}
          placeholder="Paste a URL (YouTube, audio file, link)"
          className="no-drag min-w-0 flex-1 rounded-md border border-white/8 bg-white/[0.025] px-2 py-1.5 text-[12px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
        />
        <button
          type="button"
          onClick={loadFromInput}
          disabled={!input.trim()}
          className="inline-flex items-center gap-1 rounded-md border border-accent/40 bg-accent/[0.1] px-2 py-1.5 font-mono text-[9.5px] uppercase tracking-wider text-accent transition hover:bg-accent/[0.15] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Play className="h-3 w-3" />
          load
        </button>
      </div>

      {/* presets for the active mode */}
      {presetsForMode.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[8.5px] uppercase tracking-[0.22em] text-white/35">
            presets · click to load
          </span>
          <div className="flex flex-wrap items-center gap-1">
            {presetsForMode.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => loadPreset(p)}
                disabled={!p.url}
                className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-white/65 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* player surface */}
      <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/40 p-2.5">
        {!loaded ? (
          <p className="px-1 py-3 text-center font-mono text-[10px] uppercase tracking-wider text-white/35">
            nothing playing · paste a URL or pick a preset
          </p>
        ) : loaded.kind === "youtube" ? (
          <div className="overflow-hidden rounded-lg border border-white/10">
            <iframe
              key={loaded.src}
              title={loaded.label}
              src={loaded.src}
              className="aspect-video w-full"
              sandbox="allow-scripts allow-same-origin allow-presentation"
              allow="encrypted-media; picture-in-picture"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : loaded.kind === "audio" ? (
          <video ref={audioRef} src={loaded.src} controls className="w-full" />
        ) : (
          <div className="flex flex-col gap-2 px-1 py-2">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">
              this link can't be embedded safely
            </p>
            <button
              type="button"
              onClick={() => window.open(loaded.url, "_blank", "noopener,noreferrer")}
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5 font-mono text-[9.5px] uppercase tracking-wider text-white/70 transition hover:bg-white/[0.06]"
            >
              <ExternalLink className="h-3 w-3" />
              open in browser
            </button>
          </div>
        )}

        {loaded && (
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 flex-1 truncate font-mono text-[9px] uppercase tracking-wider text-white/40" title={loaded.url}>
              {loaded.label}
            </span>
            <div className="flex items-center gap-1">
              {mode === "pip" &&
                (pipAvailable ? (
                  <button
                    type="button"
                    onClick={enterPip}
                    className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-1 font-mono text-[9px] uppercase tracking-wider text-white/65 transition hover:bg-white/[0.06]"
                  >
                    <PictureInPicture2 className="h-3 w-3" />
                    pip
                  </button>
                ) : (
                  <span
                    title="Picture-in-Picture only works for native audio/video, not YouTube embeds"
                    className="inline-flex items-center gap-1 rounded-md border border-white/8 bg-white/[0.02] px-1.5 py-1 font-mono text-[9px] uppercase tracking-wider text-white/30"
                  >
                    <PictureInPicture2 className="h-3 w-3" />
                    pip unavailable
                  </span>
                ))}
              <button
                type="button"
                onClick={clear}
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
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-white/10 bg-white/[0.012] px-2.5 py-1.5 opacity-70">
        <Sparkles className="h-3.5 w-3.5 text-white/35" />
        <div className="flex flex-col">
          <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/45">
            AI Radio Mode
          </span>
          <span className="font-mono text-[8.5px] uppercase tracking-wider text-white/30">
            planned · Atlas narration of news / alerts / mission updates
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
// helpers
// ---------------------------------------------------------------------------

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

function readPersisted(): Persisted | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return {
      open: typeof parsed.open === "boolean" ? parsed.open : false,
      lastUrl: typeof parsed.lastUrl === "string" ? parsed.lastUrl : ""
    };
  } catch {
    return null;
  }
}

function writePersisted(p: Persisted): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // ignore quota / privacy-mode failures
  }
}

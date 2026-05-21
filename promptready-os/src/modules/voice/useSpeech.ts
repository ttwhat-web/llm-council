/**
 * Push-to-talk via the browser Web Speech API · honest local transcription.
 *
 * We ONLY surface real `SpeechRecognition` output. If the API is missing
 * the hook reports `supported: false` and the page disables PTT and falls
 * back to text. No audio is uploaded by us; transcription is whatever the
 * browser provides. Nothing here executes a command — it just yields text.
 *
 * Minimal local typings (the DOM lib does not ship SpeechRecognition).
 */

import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
  isFinal: boolean;
  length: number;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface UseSpeech {
  supported: boolean;
  listening: boolean;
  transcript: string;
  error: string | null;
  start(): void;
  stop(): void;
  reset(): void;
}

export function useSpeech(onFinal?: (text: string) => void): UseSpeech {
  const [supported] = useState<boolean>(() => getCtor() !== null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      // ignore
    }
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setError(null);
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) {
      setError("browser speech API unavailable");
      return;
    }
    setError(null);
    setTranscript("");
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        text += r[0].transcript;
      }
      setTranscript(text.trim());
      const last = e.results[e.results.length - 1];
      if (last && last.isFinal) {
        const finalText = text.trim();
        if (finalText) onFinalRef.current?.(finalText);
      }
    };
    rec.onerror = (ev) => {
      setError(ev.error ? `speech error · ${ev.error}` : "speech error");
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "could not start speech");
      setListening(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      try {
        recRef.current?.abort();
      } catch {
        // ignore
      }
    };
  }, []);

  return { supported, listening, transcript, error, start, stop, reset };
}

// ---------------------------------------------------------------------------
// Microphone permission state · honest read-only query.
// ---------------------------------------------------------------------------

export type MicPermission = "granted" | "denied" | "prompt" | "unknown";

/**
 * Observe the microphone permission via navigator.permissions when the
 * Permissions API supports the "microphone" descriptor. We NEVER prompt or
 * capture here — this only reads + subscribes to the state so the orb can
 * show granted / denied / prompt / unknown. Falls back to "unknown" when the
 * API is missing (some browsers, notably Firefox for "microphone").
 */
export function useMicPermission(): MicPermission {
  const [state, setState] = useState<MicPermission>("unknown");

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return;
    let status: PermissionStatus | null = null;
    let cancelled = false;
    const onChange = () => {
      if (status && !cancelled) setState(status.state as MicPermission);
    };
    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((s) => {
        if (cancelled) return;
        status = s;
        setState(s.state as MicPermission);
        s.addEventListener("change", onChange);
      })
      .catch(() => {
        if (!cancelled) setState("unknown");
      });
    return () => {
      cancelled = true;
      status?.removeEventListener("change", onChange);
    };
  }, []);

  return state;
}

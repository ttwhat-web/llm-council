/**
 * Real microphone waveform · Web Audio API · Operator Voice Console.
 *
 * HONEST visualization only. When `active` is true we request the mic via
 * getUserMedia, wire it through an AnalyserNode, and expose live amplitude
 * samples (0..1) sampled on requestAnimationFrame. When `active` is false
 * — or getUserMedia / AudioContext is unavailable, or permission is denied
 * — we expose an empty sample set so the UI can render a STATIC idle ring.
 * There is NO synthetic / fake data path. The mic stream and AudioContext
 * are fully torn down whenever we stop capturing or the component unmounts,
 * so there is never lingering audio access.
 */

import { useEffect, useRef, useState } from "react";

export interface UseWaveform {
  /** Live amplitude samples (0..1). Empty while idle / unavailable. */
  samples: number[];
  /** True only while a real mic stream is being analysed. */
  capturing: boolean;
  /** True when getUserMedia + AudioContext exist in this browser. */
  available: boolean;
  /** Set when the mic could not be opened (e.g. permission denied). */
  error: string | null;
}

const BAR_COUNT = 48;

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function mediaAvailable(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function" &&
    getAudioContextCtor() !== null
  );
}

export function useWaveform(active: boolean): UseWaveform {
  const [available] = useState<boolean>(() => mediaAvailable());
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [samples, setSamples] = useState<number[]>([]);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const teardown = () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (ctxRef.current) {
        void ctxRef.current.close().catch(() => undefined);
        ctxRef.current = null;
      }
      setCapturing(false);
      setSamples([]);
    };

    if (!active || !available) {
      teardown();
      return teardown;
    }

    const Ctor = getAudioContextCtor();
    if (!Ctor) {
      teardown();
      return teardown;
    }

    setError(null);
    void navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const ctx = new Ctor();
        ctxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.75;
        source.connect(analyser);
        const buf = new Uint8Array(analyser.frequencyBinCount);
        setCapturing(true);

        const tick = () => {
          analyser.getByteTimeDomainData(buf);
          const step = Math.floor(buf.length / BAR_COUNT) || 1;
          const next: number[] = [];
          for (let i = 0; i < BAR_COUNT; i++) {
            // amplitude deviation from the 128 midpoint, normalised to 0..1
            const v = Math.abs(buf[i * step] - 128) / 128;
            next.push(Math.min(1, v));
          }
          setSamples(next);
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "microphone unavailable");
        teardown();
      });

    return () => {
      cancelled = true;
      teardown();
    };
  }, [active, available]);

  return { samples, capturing, available, error };
}

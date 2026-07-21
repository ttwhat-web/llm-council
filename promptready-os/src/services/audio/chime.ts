/**
 * Ready chime · one soft, synthesized two-note tone — the same idea
 * as Mail.app's "new mail" cue. Generated with the Web Audio API
 * rather than shipped as an audio asset, so there's nothing to fetch
 * and nothing that can go missing from a build.
 *
 * Best-effort only. Browsers block audio until a real user gesture
 * has unlocked the page's audio context — that's expected and never
 * surfaced as an error; a blocked chime degrades to silently nothing,
 * same as every other honest fallback in this app.
 */

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    return new Ctor();
  } catch {
    return null;
  }
}

function playTone(ctx: AudioContext, freqHz: number, startAt: number, durationSec: number, peakGain: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freqHz;
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(peakGain, startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + durationSec + 0.02);
}

export function playReadyChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    const now = ctx.currentTime + 0.01;
    playTone(ctx, 880, now, 0.22, 0.05); // A5
    playTone(ctx, 1318.5, now + 0.09, 0.28, 0.045); // E6 — soft major-sixth lift
    window.setTimeout(() => void ctx.close().catch(() => {}), 700);
  } catch {
    // best-effort only
  }
}

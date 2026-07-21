"use client";

import { Sparkles } from "lucide-react";
import { useBrainStore } from "@/store/brain";

/**
 * First-launch welcome.
 *
 * Was a 5-step "build your own AI brain" wizard (name it, pick a
 * persona, choose memory connectors, pick engines) that never once
 * mentioned Gmail, Calendar, or the morning routine — the actual
 * product. A founder finishing it landed back on Home's "nothing is
 * connected yet" empty state having answered five questions that
 * didn't matter. One honest screen replaces it: what Operator is, and
 * a single way in. Real setup (Google, AI keys) already lives in
 * Settings and Home's own empty state points there.
 *
 * Renders as a full-screen overlay only when `bootstrapped === false`.
 * Once a brain exists, the component returns null.
 */

export function BrainBootstrap() {
  const bootstrapped = useBrainStore((s) => s.bootstrapped);
  const bootstrap = useBrainStore((s) => s.bootstrap);
  const enableDemo = useBrainStore((s) => s.enableDemo);

  if (bootstrapped) return null;

  const onGetStarted = () => {
    bootstrap({ name: "Operator", mode: "builder", sources: ["brain-notes"], engines: ["deterministic"] });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-graphite-950/95 backdrop-blur">
      <div className="flex w-full max-w-[520px] flex-col gap-6 rounded-3xl border border-white/8 bg-white/[0.018] p-8 shadow-glass">
        <header className="flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">operator</span>
          <h2 className="text-[26px] font-semibold leading-tight text-white">Handles the parts of your day you don't want to.</h2>
          <p className="max-w-[46ch] text-[13.5px] leading-relaxed text-white/60">
            Operator reads your inbox and calendar, prepares real replies and decisions, and asks for your
            approval before anything happens. Nothing sends, moves, or changes without you.
          </p>
        </header>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onGetStarted}
            className="inline-flex items-center justify-center rounded-xl bg-accent/90 px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-glow transition hover:bg-accent"
          >
            Get started
          </button>
          <button
            type="button"
            onClick={enableDemo}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-[12.5px] font-medium text-white/70 transition hover:bg-white/[0.06]"
          >
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            See a populated example first
          </button>
        </div>
      </div>
    </div>
  );
}

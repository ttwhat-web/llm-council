"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Cpu,
  LineChart,
  Rocket,
  Target,
  Workflow,
  X
} from "lucide-react";
import {
  hasCompletedOnboarding,
  markOnboardingComplete
} from "@/lib/onboarding";

/**
 * First-run wizard mounted on /app.
 *
 * Five short slides. Skippable. Persists `pf.onboarding.v1.completed`
 * so reloads + new sessions don't re-trigger it. Every claim made is
 * about behaviour that's actually wired today; no future-tense fluff.
 */

interface Slide {
  Icon: typeof Workflow;
  eyebrow: string;
  title: string;
  body: string;
  bullets?: string[];
}

const SLIDES: Slide[] = [
  {
    Icon: Target,
    eyebrow: "01 · welcome",
    title: "Operator.Center — Mission Control for AI Workflows.",
    body: "You stop pasting. You dispatch. Every interaction is a mission with input, routing, telemetry, output and a receipt."
  },
  {
    Icon: Workflow,
    eyebrow: "02 · what is a mission",
    title: "A mission is a unit of work, not a chat.",
    body: "Paste a messy prompt, an error log, or a product idea. The pipeline cleans, structures, routes, executes and scores it. Every stage is real telemetry — no fake spinners.",
    bullets: [
      "Six typed stages: Clean → Intent → Structure → Constraints → Generate → Validate",
      "Real provider + model + latency surfaced on every run",
      "Outputs ship as named deliverables (Cursor Task, Claude Prompt, ...)"
    ]
  },
  {
    Icon: Cpu,
    eyebrow: "03 · local-first",
    title: "It works without an account, without a key.",
    body: "A deterministic rules engine handles missions when no provider is configured. Install Ollama for an unlimited local model. Cloud is an accelerator, not a gate.",
    bullets: [
      "No signup required — anonymous quota is real",
      "Local Ollama runs unlimited missions, never touches the cloud",
      "Receipts, stacks, drafts and notes persist to this browser only"
    ]
  },
  {
    Icon: Rocket,
    eyebrow: "04 · run your first mission",
    title: "Paste anything into Mission Input and press Run Mission.",
    body: "The Operations Pipeline shows real stage progress. The Output Console renders the rendered deliverable and the export menu hands you the format your downstream tool wants.",
    bullets: [
      "⌘K opens the Command Palette from anywhere",
      "⌘/Ctrl + ⏎ runs the current mission",
      "Save receipts from the panel above OutputTabs"
    ]
  },
  {
    Icon: Brain,
    eyebrow: "05 · library · memory · terminal",
    title: "Three surfaces grow with you.",
    body: "Library archives your receipts, stacks and drafts. Memory captures notes you can attach to future missions. Terminal holds your watchlist today and ships live feeds in the Operator tier.",
    bullets: [
      "Library — local archive of every mission, every stack, every saved export",
      "Memory — manual notes today; Obsidian / GitHub / Gmail connectors next",
      "Terminal — manual watchlist today; live market / repo / inbox feeds next"
    ]
  }
];

const FINAL: Slide = {
  Icon: LineChart,
  eyebrow: "ready",
  title: "You're set. Run a mission.",
  body: "Settings → Local data lets you export, import or wipe everything in this browser. You stay in control."
};

export function OnboardingWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  // Mount detection — only run on the client.
  useEffect(() => {
    if (!hasCompletedOnboarding()) setOpen(true);
  }, []);

  const slides = [...SLIDES, FINAL];
  const last = step === slides.length - 1;
  const current = slides[step];

  function done() {
    markOnboardingComplete();
    setOpen(false);
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) done();
        }}
      >
        <motion.div
          key="dialog"
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.98 }}
          transition={{ duration: 0.16 }}
          className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-bg/95 p-5 shadow-glass"
        >
          <button
            type="button"
            onClick={done}
            className="absolute right-3 top-3 rounded-md p-1 text-white/55 transition hover:bg-white/8 hover:text-white"
            aria-label="Skip onboarding"
            title="Skip"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2 pb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 ring-1 ring-accent/30">
              <current.Icon className="h-3.5 w-3.5 text-accent" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
              {current.eyebrow}
            </span>
            <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-white/40">
              {step + 1} / {slides.length}
            </span>
          </div>

          <h2 className="text-lg font-semibold tracking-tight text-white md:text-xl">
            {current.title}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-white/70">
            {current.body}
          </p>
          {current.bullets && (
            <ul className="mt-3 flex flex-col gap-1.5 text-[12.5px] text-white/65">
              {current.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent/70" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}

          <footer className="mt-5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={done}
              className="font-mono text-[10px] uppercase tracking-wider text-white/40 transition hover:text-white"
            >
              skip
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={step === 0}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[12px] font-medium text-white/85 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <button
                type="button"
                onClick={() => (last ? done() : setStep((s) => s + 1))}
                className="inline-flex items-center gap-1 rounded-lg bg-accent/90 px-3 py-1 text-[12px] font-semibold text-white shadow-glow transition hover:bg-accent"
              >
                {last ? "Open Mission Control" : "Next"}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </footer>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

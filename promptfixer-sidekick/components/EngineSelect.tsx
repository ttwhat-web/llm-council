"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Cloud, Cpu, Layers, Settings2 } from "lucide-react";
import clsx from "clsx";
import type { Engine } from "@/lib/types";

interface Option {
  id: Engine;
  label: string;
  blurb: string;
  Icon: typeof Cloud;
}

const OPTIONS: Option[] = [
  {
    id: "auto",
    label: "Auto",
    blurb: "Web/iPhone → cloud. Desktop → Ollama if configured, else cloud.",
    Icon: Layers
  },
  {
    id: "cloud",
    label: "Cloud AI",
    blurb: "Server-side cloud provider. Counts against your daily limit.",
    Icon: Cloud
  },
  {
    id: "ollama",
    label: "Local Ollama",
    blurb:
      "Unlimited local mode — runs on your own Mac. Strict by default: never falls through to cloud.",
    Icon: Cpu
  },
  {
    id: "deterministic",
    label: "Rules Only",
    blurb: "No AI call. Ships the deterministic prompt as-is.",
    Icon: Settings2
  }
];

interface Props {
  value: Engine;
  onChange: (engine: Engine) => void;
  compact?: boolean;
}

export function EngineSelect({ value, onChange, compact }: Props) {
  const [open, setOpen] = useState(false);
  const current = OPTIONS.find((o) => o.id === value) ?? OPTIONS[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "no-drag flex items-center gap-2 rounded-xl border border-white/8 bg-white/5 px-3 py-1.5 text-sm font-medium text-white/85 transition hover:bg-white/8",
          compact && "text-xs px-2.5 py-1"
        )}
      >
        <current.Icon className="h-3.5 w-3.5 text-accent" />
        <span>{current.label}</span>
        <ChevronDown className={clsx("h-3.5 w-3.5 transition", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl glass-strong shadow-glass"
          >
            <ul className="py-1">
              {OPTIONS.map((opt) => {
                const active = opt.id === value;
                return (
                  <li key={opt.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(opt.id);
                        setOpen(false);
                      }}
                      className={clsx(
                        "no-drag flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-white/5",
                        active && "bg-white/5"
                      )}
                    >
                      <opt.Icon
                        className={clsx(
                          "mt-0.5 h-4 w-4 shrink-0",
                          active ? "text-accent" : "text-white/45"
                        )}
                      />
                      <span className="flex flex-col">
                        <span className="font-medium text-white">{opt.label}</span>
                        <span className="text-xs text-white/55">{opt.blurb}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

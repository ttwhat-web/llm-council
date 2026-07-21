"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import clsx from "clsx";

interface Props {
  text: string;
  className?: string;
  label?: string;
}

export function CopyButton({ text, className, label = "Copy" }: Props) {
  const [done, setDone] = useState(false);

  const onClick = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1400);
    } catch {
      // ignore — clipboard may be unavailable in some contexts
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "no-drag inline-flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/80 transition hover:bg-white/10",
        className
      )}
    >
      {done ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? "Copied" : label}
    </button>
  );
}

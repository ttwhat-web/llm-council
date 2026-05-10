"use client";

import { forwardRef } from "react";
import clsx from "clsx";

/**
 * Primitive · Button
 *
 * Tone:    accent | ghost | outline | danger
 * Size:    sm | md
 * The "accent" tone gets the soft glow shadow defined in tokens.css.
 */

type Tone = "accent" | "ghost" | "outline" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
  size?: Size;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const TONES: Record<Tone, string> = {
  accent:
    "bg-accent/90 text-white shadow-glow hover:bg-accent border border-transparent",
  ghost:
    "border border-white/10 bg-white/[0.03] text-white/85 hover:bg-white/[0.06]",
  outline:
    "border border-accent/30 bg-accent/[0.06] text-accent hover:bg-accent/[0.12]",
  danger:
    "border border-rose/30 bg-rose/10 text-rose hover:bg-rose/20"
};

const SIZES: Record<Size, string> = {
  sm: "px-2.5 py-1 text-[12px]",
  md: "px-3 py-1.5 text-sm"
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { tone = "ghost", size = "md", loading, iconLeft, iconRight, className, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      {...rest}
      className={clsx(
        "no-drag inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
        TONES[tone],
        SIZES[size],
        className
      )}
      style={{
        transitionDuration: "var(--pr-duration-fast)",
        transitionTimingFunction: "var(--pr-easing-snap)"
      }}
    >
      {iconLeft}
      {loading ? <Spinner /> : null}
      {children}
      {iconRight}
    </button>
  );
});

function Spinner() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 animate-spin"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" fill="none" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" fill="none" />
    </svg>
  );
}

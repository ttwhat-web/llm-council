"use client";

import { useEffect, useState } from "react";
import type { ClientContext } from "./types";

/**
 * Detect where the UI is running.
 *
 * - "desktop"  → loaded inside the Tauri shell (window.__TAURI__ is present)
 * - "mobile"   → mobile UA (iPhone / iPad / Android / etc.)
 * - "web"      → anything else (default)
 *
 * Detection is best-effort and SSR-safe: returns "web" until the component
 * mounts and we can sniff `window`.
 */
export function detectClientContext(): ClientContext {
  if (typeof window === "undefined") return "web";

  // Tauri injects __TAURI__ at runtime when the page is loaded inside the shell.
  // (Same check the floating window uses for close/minimize.)
  // @ts-expect-error - Tauri runtime injection.
  if (window.__TAURI__) return "desktop";

  const ua = (navigator.userAgent || "").toLowerCase();
  const isMobile =
    /iphone|ipod|android.+mobile|windows phone|blackberry|bb10|mobile safari/i.test(ua) ||
    // iPadOS 13+ reports as macOS but has touch — treat tablets as mobile here.
    (/(ipad|macintosh)/.test(ua) && "ontouchend" in document);

  return isMobile ? "mobile" : "web";
}

/** React hook variant. Re-runs once on mount. */
export function useClientContext(initial: ClientContext = "web"): ClientContext {
  const [ctx, setCtx] = useState<ClientContext>(initial);
  useEffect(() => {
    setCtx(detectClientContext());
  }, []);
  return ctx;
}

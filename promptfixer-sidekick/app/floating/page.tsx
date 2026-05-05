"use client";

import { useEffect } from "react";
import { Minus, X } from "lucide-react";
import { PromptFixer } from "@/components/PromptFixer";

/**
 * Floating window route. Loaded by Tauri (or any borderless Electron-like shell)
 * as a small always-on-top overlay. The top strip is the OS drag region.
 */
export default function FloatingWindow() {
  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    return () => {
      document.documentElement.style.background = "";
      document.body.style.background = "";
    };
  }, []);

  const close = async () => {
    if (typeof window === "undefined") return;
    try {
      // @ts-expect-error - Tauri injects __TAURI__ at runtime when present.
      const tauri = window.__TAURI__;
      if (tauri?.window) {
        await tauri.window.appWindow.close();
        return;
      }
    } catch {
      /* ignore */
    }
    window.close();
  };

  const minimize = async () => {
    if (typeof window === "undefined") return;
    try {
      // @ts-expect-error - Tauri runtime injection.
      const tauri = window.__TAURI__;
      if (tauri?.window) {
        await tauri.window.appWindow.minimize();
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex min-h-screen items-stretch justify-stretch bg-transparent p-2">
      <div className="glass-strong flex h-full w-full flex-col overflow-hidden rounded-2xl shadow-glass">
        <div className="drag-region flex items-center justify-between border-b border-white/5 px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_2px_rgba(124,155,255,0.6)]" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/55">
              PromptFixer
            </span>
          </div>
          <div className="no-drag flex items-center gap-1">
            <button
              onClick={minimize}
              className="rounded-md p-1 text-white/55 transition hover:bg-white/10 hover:text-white"
              aria-label="Minimize"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={close}
              className="rounded-md p-1 text-white/55 transition hover:bg-red-500/20 hover:text-red-200"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <PromptFixer variant="floating" />
        </div>
      </div>
    </div>
  );
}

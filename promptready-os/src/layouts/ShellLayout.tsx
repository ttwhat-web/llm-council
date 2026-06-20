"use client";

import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import {
  CircleDot,
  LineChart,
  Mic,
  Settings as SettingsIcon,
  Terminal
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CommandPalette } from "@/components/CommandPalette";
import { useUiModeStore } from "@/store/uiMode";

/**
 * Shell layout · Operator Center.
 *
 * Quiet by design. The header carries one element only — the voice
 * mic — and reduces to a drag region otherwise. The rail is the
 * Home logo plus three icons (Console · Markets · Settings); every
 * other surface lives in Cmd+K. Voice is an honest placeholder
 * until ElevenLabs is connected in Settings.
 */

interface NavItem {
  to: string;
  label: string;
  Icon: typeof LineChart;
}

const PRIMARY_NAV: NavItem[] = [
  { to: "/console", label: "Console", Icon: Terminal },
  { to: "/markets", label: "Markets", Icon: LineChart },
  { to: "/settings", label: "Settings", Icon: SettingsIcon }
];

export function ShellLayout() {
  const secondScreen = useUiModeStore((s) => s.secondScreen);
  const location = useLocation();
  const navigate = useNavigate();
  const [voiceOpen, setVoiceOpen] = useState(false);

  // Migrate any deep-link landing on /atlas (the previous home) so a
  // returning user sees the new Home instead of the legacy cinema
  // canvas. Honors explicit /atlas requests via the command palette.
  const migratedHomeRef = useRef(false);
  useEffect(() => {
    if (migratedHomeRef.current) return;
    migratedHomeRef.current = true;
    if (location.pathname === "/atlas") navigate("/", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen w-screen max-w-full overflow-hidden text-white">
      {!secondScreen && (
        <aside className="flex w-[60px] shrink-0 flex-col items-center justify-between border-r border-white/[0.04] py-4">
          <div className="flex flex-col items-center gap-5">
            <Link
              to="/"
              title="Home"
              className="flex h-9 w-9 items-center justify-center rounded-md bg-white/[0.05] text-white/85 transition hover:bg-white/[0.08] hover:text-white"
            >
              <CircleDot className="h-4 w-4" />
            </Link>
            <nav className="flex flex-col items-stretch gap-1" aria-label="Primary">
              {PRIMARY_NAV.map(({ to, label, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  title={label}
                  className={({ isActive }) =>
                    clsx(
                      "group relative flex h-9 w-9 items-center justify-center rounded-md transition",
                      isActive
                        ? "bg-white/[0.06] text-white"
                        : "text-white/45 hover:bg-white/[0.04] hover:text-white/85"
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>
      )}

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {!secondScreen && (
          <header className="drag-region flex min-w-0 items-center justify-end gap-2 px-5 py-2">
            <button
              type="button"
              onClick={() => setVoiceOpen(true)}
              title="Voice"
              aria-label="Voice"
              className="no-drag inline-flex h-8 w-8 items-center justify-center rounded-md text-white/40 transition hover:bg-white/[0.04] hover:text-white/80"
            >
              <Mic className="h-4 w-4" />
            </button>
          </header>
        )}

        <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </div>
      </main>

      <CommandPalette />
      <VoiceSheet open={voiceOpen} onClose={() => setVoiceOpen(false)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Voice sheet (honest placeholder until ElevenLabs is wired)
// ---------------------------------------------------------------------------

function VoiceSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-end p-6"
      role="dialog"
      aria-label="Voice"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />
      <section
        className="relative flex w-full max-w-sm flex-col gap-3 rounded-2xl bg-[#101218] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <Mic className="h-4 w-4 text-white/75" />
          <h2 className="text-[14px] font-semibold text-white">Voice</h2>
          <span className="ml-auto rounded-full bg-amber-500/[0.12] px-2 py-0.5 text-[10.5px] font-medium text-amber-200">
            Needs setup
          </span>
        </div>
        <p className="text-[13px] leading-relaxed text-white/55">
          Voice will use ElevenLabs for low-latency conversation. Add an ElevenLabs API key in Settings → Providers to enable push-to-talk.
        </p>
        <Link
          to="/settings"
          onClick={onClose}
          className="inline-flex w-fit items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[12.5px] font-medium text-black transition hover:bg-white/90"
        >
          Open Settings
        </Link>
      </section>
    </div>
  );
}

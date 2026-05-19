"use client";

import { Link } from "react-router-dom";
import {
  Brain,
  Github,
  Phone,
  Rocket,
  ShieldCheck
} from "lucide-react";
import { useBrainStore } from "@/store/brain";
import { useMissionStore } from "@/store/mission";
import { useAtlasStore } from "@/store/atlas";

/**
 * Command Room empty state · UX RESET 04.
 *
 * Five action tiles surfaced only when the corresponding counters are
 * empty. Each tile is a real entry point · no fake routes · no fake
 * automation. Tiles disappear individually as the operator fills them
 * in, so the row collapses as the brain grows.
 */

export function CommandRoomEmptyState() {
  const identity = useBrainStore((s) => s.identity);
  const sources = useBrainStore((s) => s.memorySources);
  const history = useMissionStore((s) => s.history);
  const telegramLink = useAtlasStore((s) => s.telegram);
  const snapshots = useAtlasStore((s) => s.snapshots);

  const needBrain = !identity;
  const needRepo = sources.filter((s) => s.kind === "github").length === 0;
  const needMission = history.length === 0;
  const needRemote = !telegramLink;
  const noPassport = snapshots.length === 0;

  const tiles: TileSpec[] = [];

  if (needBrain) {
    tiles.push({
      Icon: Brain,
      label: "Create Brain",
      hint: "bootstrap identity · mode · engines",
      to: "/",
      tone: "accent"
    });
  }
  if (needMission) {
    tiles.push({
      Icon: Rocket,
      label: "Dispatch Mission",
      hint: "send your first brief",
      to: "/mission-control",
      tone: "accent"
    });
  }
  if (needRepo) {
    tiles.push({
      Icon: Github,
      label: "Add Repo",
      hint: "attach a GitHub source",
      to: "/mission-control",
      tone: "default"
    });
  }
  if (needRemote) {
    tiles.push({
      Icon: Phone,
      label: "Connect Remote",
      hint: "Telegram link code · local issuance",
      to: "/settings",
      tone: "default"
    });
  }
  if (noPassport) {
    tiles.push({
      Icon: ShieldCheck,
      label: "Export Passport",
      hint: "first .brainpack snapshot",
      to: "/settings",
      tone: "default"
    });
  }

  if (tiles.length === 0) return null;

  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-3">
      <header className="flex items-center justify-between">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
          command room · ignition
        </span>
        <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/40">
          {tiles.length} open path{tiles.length === 1 ? "" : "s"}
        </span>
      </header>
      <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <li key={t.label}>
            <Link
              to={t.to}
              className={
                t.tone === "accent"
                  ? "group flex h-full flex-col gap-1 rounded-xl border border-accent/30 bg-accent/[0.06] p-3 transition hover:bg-accent/[0.12]"
                  : "group flex h-full flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.015] p-3 transition hover:border-white/20 hover:bg-white/[0.04]"
              }
            >
              <t.Icon
                className={
                  t.tone === "accent"
                    ? "h-3.5 w-3.5 text-accent"
                    : "h-3.5 w-3.5 text-white/65 group-hover:text-accent"
                }
              />
              <span className="text-[12.5px] font-semibold text-white">{t.label}</span>
              <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/45">
                {t.hint}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

interface TileSpec {
  Icon: typeof Brain;
  label: string;
  hint: string;
  to: string;
  tone: "accent" | "default";
}

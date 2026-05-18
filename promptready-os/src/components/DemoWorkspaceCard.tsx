"use client";

import { useState } from "react";
import { Loader2, Sparkles, Trash2 } from "lucide-react";
import { useBrainStore } from "@/store/brain";
import { useMissionStore } from "@/store/mission";
import { useAtlasStore } from "@/store/atlas";
import { seedDemoWorkspace, resetDemoWorkspace } from "@/services/demoWorkspace";

/**
 * Demo Workspace card · Phase 19.
 *
 * One button gives a customer a complete tour in 60 seconds:
 * demo brain, sample receipts, repo context, workflow, terminal
 * pins, memory docs, inbox. Every surface is labelled "demo data".
 *
 * Reset wipes everything back to empty so the next demo starts clean.
 */

export function DemoWorkspaceCard() {
  const demo = useBrainStore((s) => s.demo);
  const receipts = useMissionStore((s) => s.history.length);
  const docs = useAtlasStore((s) => s.memoryDocs.length);
  const nodes = useAtlasStore((s) => s.workflowNodes.length);

  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const onSeed = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const out = seedDemoWorkspace();
      setFlash(
        `seeded · ${out.receipts} receipts · ${out.nodes} workflow nodes · ${out.pins} pins · ${out.docs} memory docs`
      );
    } finally {
      setBusy(false);
      window.setTimeout(() => setFlash(null), 6000);
    }
  };

  const onReset = () => {
    if (busy) return;
    if (
      !window.confirm(
        "Reset demo workspace? Brain identity, missions, atlas, terminal pins, and inbox will be wiped."
      )
    )
      return;
    setBusy(true);
    try {
      resetDemoWorkspace();
      setFlash("workspace reset · clean slate");
    } finally {
      setBusy(false);
      window.setTimeout(() => setFlash(null), 4000);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Demo workspace</span>
        </div>
        <span
          className={
            demo
              ? "rounded border border-accent/30 bg-accent/[0.08] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-accent"
              : "rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/55"
          }
        >
          {demo ? "demo active · labelled" : "empty"}
        </span>
      </header>

      <p className="text-[11.5px] text-white/65">
        Seeds a complete operator brain in 60 seconds: a demo identity,
        sample mission receipts with real deliverables, a repo context,
        a workflow canvas with mission → repo → approval → export, pinned
        terminal cards, imported memory docs, and a small inbox. Use it to
        show the product · then reset to a clean slate.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="receipts" value={String(receipts)} />
        <Stat label="memory docs" value={String(docs)} />
        <Stat label="workflow nodes" value={String(nodes)} />
        <Stat label="state" value={demo ? "demo" : "empty"} />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onSeed}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent/90 px-3 py-1.5 text-[12px] font-semibold text-white shadow-glow transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Seed demo workspace
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-md border border-rose-400/25 bg-rose-500/[0.06] px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-rose-200 hover:bg-rose-500/[0.12] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 className="h-3 w-3" /> Reset
        </button>
      </div>

      {flash && (
        <p className="mt-2 rounded-md border border-accent/30 bg-accent/[0.08] px-2 py-1 font-mono text-[10.5px] uppercase tracking-wider text-accent">
          {flash}
        </p>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1.5">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/40">
        {label}
      </span>
      <span className="text-[13px] font-semibold text-white">{value}</span>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Loader2, Play, RefreshCw } from "lucide-react";
import clsx from "clsx";
import { CopyButton } from "./CopyButton";
import type {
  ClientContext,
  Mode,
  ModelQuality,
  PreviewResponse
} from "@/lib/types";

interface Props {
  prompt: string;
  mode: Mode;
  modelQuality: ModelQuality;
  clientContext: ClientContext;
  allowCloudFallback: boolean;
  compact?: boolean;
}

export function ExecutionPreview({
  prompt,
  mode,
  modelQuality,
  clientContext,
  allowCloudFallback,
  compact
}: Props) {
  const [data, setData] = useState<PreviewResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          mode,
          modelQuality,
          clientContext,
          allowCloudFallback
        })
      });
      const body = (await res.json()) as PreviewResponse & { error?: string };
      if (!res.ok || !body.ok) {
        setError(body.error || `Preview failed (HTTP ${res.status})`);
        return;
      }
      setData(body);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
        <div className="flex flex-col gap-1">
          <div className="text-sm font-medium text-white">AI response preview</div>
          <div className="text-[12px] text-white/55">
            See what your AI tool would likely return for this prompt — architecture
            outlines, code shapes, RPGLE snippets, SQL schema, deployment notes.{" "}
            <span className="text-white/45">Counts toward your daily cloud quota.</span>
          </div>
        </div>

        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="no-drag inline-flex items-center gap-2 rounded-xl bg-accent/90 px-4 py-2 text-sm font-semibold text-white shadow-glow transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Generate preview
        </button>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-200">
            {error}
          </div>
        )}

        <div className="text-[11px] text-white/35">
          This is a preview, not the final authoritative answer. For real work,
          paste the execution-ready prompt into Claude / ChatGPT / Cursor.
        </div>
      </div>
    );
  }

  return (
    <div className={clsx("flex flex-col gap-2", compact && "gap-1.5")}>
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/55">
        <span className="rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 text-accent">
          {data.label}
        </span>
        <span className="rounded-md bg-white/5 px-2 py-0.5">
          via <span className="text-white/85">{data.resolved}</span>
          {data.model ? ` · ${data.model}` : ""}
        </span>
        {typeof data.latencyMs === "number" && (
          <span className="rounded-md bg-white/5 px-2 py-0.5">{data.latencyMs}ms</span>
        )}
        {data.isDeterministic && (
          <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-200">
            deterministic shape
          </span>
        )}
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-white/55 transition hover:bg-white/5 hover:text-white/80 disabled:opacity-40"
        >
          <RefreshCw className={clsx("h-3 w-3", busy && "animate-spin")} />
          Regenerate
        </button>
      </div>

      {data.notice && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
          {data.notice}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/8 bg-black/30">
        <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
          <div className="flex flex-col">
            <div className="text-[11px] font-medium uppercase tracking-wider text-white/55">
              {data.label}
            </div>
            <div className="text-[10px] text-white/40">
              Preview only — paste the execution-ready prompt into your AI tool for the real run.
            </div>
          </div>
          <CopyButton text={data.preview} />
        </div>
        <pre className="scrollbar-thin max-h-[60vh] min-h-0 flex-1 overflow-auto whitespace-pre-wrap px-4 py-3 font-mono text-[12px] leading-relaxed text-white/85">
          {data.preview}
        </pre>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-200">
          {error}
        </div>
      )}
    </div>
  );
}

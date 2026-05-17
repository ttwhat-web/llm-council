"use client";

import { useState } from "react";
import clsx from "clsx";
import { AlertTriangle, Download, Trash2, Upload } from "lucide-react";
import {
  clearAllLocalData,
  downloadLocalDataBundle,
  importLocalDataBundle,
  listManagedKeys,
  type ImportResult
} from "@/lib/localData";
import { resetOnboarding } from "@/lib/onboarding";

/**
 * Settings → Local data.
 *
 * Operator-owned data lives here: every `pf.*` localStorage key the
 * app writes. Three controls:
 *
 *   - Export — dumps the bundle as a downloadable JSON file
 *   - Import — restores from a previously-exported file
 *   - Clear  — wipes every managed key (with confirm)
 *
 * No network. The keys list below shows exactly what's managed.
 */

export function LocalDataPanel() {
  const [busy, setBusy] = useState<"export" | "import" | "clear" | null>(null);
  const [result, setResult] = useState<ImportResult | { kind: "cleared"; count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const keys = listManagedKeys();

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          type="button"
          disabled={busy !== null}
          onClick={async () => {
            setBusy("export");
            setError(null);
            try {
              downloadLocalDataBundle();
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(null);
            }
          }}
          className={btnClass}
        >
          <Download className="h-3.5 w-3.5" />
          Export bundle
        </button>

        <label className={clsx(btnClass, "cursor-pointer justify-center")}>
          <Upload className="h-3.5 w-3.5" />
          Import bundle
          <input
            type="file"
            accept="application/json"
            className="hidden"
            disabled={busy !== null}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setBusy("import");
              setError(null);
              try {
                const text = await file.text();
                const out = importLocalDataBundle(text);
                if (!out.ok) {
                  setError(out.error || "Import failed.");
                  setResult(null);
                } else {
                  setResult(out);
                }
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setBusy(null);
                e.target.value = "";
              }
            }}
          />
        </label>

        <button
          type="button"
          disabled={busy !== null}
          onClick={() => {
            if (
              !window.confirm(
                "Clear all local Operator.Center data in this browser? Receipts, stacks, notes, watchlist, drafts and settings will be removed. This cannot be undone."
              )
            ) {
              return;
            }
            setBusy("clear");
            setError(null);
            try {
              const { cleared } = clearAllLocalData();
              resetOnboarding();
              setResult({ kind: "cleared", count: cleared.length });
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(null);
            }
          }}
          className={clsx(btnClass, "border-rose-400/35 text-rose-200 hover:bg-rose-500/[0.08]")}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear all local data
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-rose-400/35 bg-rose-500/[0.06] px-3 py-2 text-[11.5px] text-rose-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      {result && "restored" in result && (
        <div className="rounded-md border border-emerald-400/35 bg-emerald-500/[0.06] px-3 py-2 text-[11.5px] text-emerald-200">
          Imported {result.restored.length} key{result.restored.length === 1 ? "" : "s"}.
          {result.skipped.length > 0 && (
            <> Skipped {result.skipped.length} unrecognised entr{result.skipped.length === 1 ? "y" : "ies"}.</>
          )}{" "}
          Reload the page to refresh every surface.
        </div>
      )}

      {result && "kind" in result && (
        <div className="rounded-md border border-emerald-400/35 bg-emerald-500/[0.06] px-3 py-2 text-[11.5px] text-emerald-200">
          Cleared {result.count} key{result.count === 1 ? "" : "s"}. Reload to see
          the fresh empty state.
        </div>
      )}

      <details className="rounded-xl border border-white/8 bg-white/[0.012] px-3 py-2 text-[11.5px] text-white/65">
        <summary className="cursor-pointer text-white/85">
          Managed localStorage keys ({keys.length})
        </summary>
        <ul className="mt-2 grid grid-cols-1 gap-0.5 font-mono text-[10.5px] text-white/50 sm:grid-cols-2">
          {keys.map((k) => (
            <li key={k}>· {k}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

const btnClass =
  "no-drag inline-flex items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/85 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50";

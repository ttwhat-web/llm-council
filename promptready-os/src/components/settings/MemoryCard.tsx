"use client";

/**
 * Memory · Settings card.
 *
 * The founder's editable profile. Lives in localStorage on this
 * device only. Read by the drafting service (every draft request
 * passes memory). Read later by the briefing narrator and voice TTS.
 *
 * v0 contract:
 *   * one global memory per device
 *   * auto-save on blur (no Save button — the field IS the save)
 *   * list fields take one item per line
 *   * Export → downloads JSON file
 *   * Import → reads JSON file
 *   * Reset → confirmation, returns to empty
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { Brain, Download, Trash2, Upload } from "lucide-react";
import { useOperatorMemoryStore } from "@/store/operatorMemory";
import type { FounderMemory } from "@/services/operator/memorySeed";

export function MemoryCard() {
  const memory = useOperatorMemoryStore((s) => s.memory);
  const updatedAt = useOperatorMemoryStore((s) => s.updatedAt);
  const setMemory = useOperatorMemoryStore((s) => s.setMemory);
  const reset = useOperatorMemoryStore((s) => s.reset);
  const exportJson = useOperatorMemoryStore((s) => s.exportJson);
  const importJson = useOperatorMemoryStore((s) => s.importJson);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fieldCount = useMemo(() => countFields(memory), [memory]);

  const onExport = useCallback(() => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    a.href = url;
    a.download = `operator-memory-${ts}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportJson]);

  const onImportClick = () => fileInputRef.current?.click();

  const onImportFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = ""; // allow re-importing same file later
      if (!file) return;
      setError(null);
      try {
        const text = await file.text();
        const result = importJson(text);
        if (!result.ok) setError(result.error);
      } catch (err) {
        setError((err as Error).message);
      }
    },
    [importJson]
  );

  const onReset = useCallback(() => {
    if (!confirm("Reset Operator memory? This removes everything you've told Operator about yourself.")) return;
    reset();
  }, [reset]);

  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-white/[0.025] p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[11px] uppercase tracking-[0.15em] text-white/40">Memory</span>
          <h2 className="text-[18px] font-semibold tracking-tight text-white">
            <Brain className="mr-2 inline h-4 w-4 -translate-y-px text-white/65" />
            What Operator knows about you
          </h2>
          <p className="text-[12.5px] leading-relaxed text-white/55">
            Tell Operator who you are so it can write and prioritize like someone who works for you. Lives on this device — never sent anywhere.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-white/[0.04] px-3 py-1 text-[11px] text-white/65">
          {fieldCount === 0 ? "empty" : `${fieldCount} field${fieldCount === 1 ? "" : "s"}`}
          {updatedAt && ` · ${formatAgo(updatedAt)}`}
        </span>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <TextField
          label="Founder name"
          value={memory.firstName ?? ""}
          onChange={(v) => setMemory({ firstName: v || undefined })}
          placeholder="Tunç"
        />
        <TextField
          label="Full name (optional)"
          value={memory.fullName ?? ""}
          onChange={(v) => setMemory({ fullName: v || undefined })}
          placeholder="Tunç Yıldız"
        />
        <TextField
          label="Preferred language"
          value={memory.preferredLanguage ?? ""}
          onChange={(v) => setMemory({ preferredLanguage: v || undefined })}
          placeholder="Turkish"
        />
        <TextField
          label="Tone preference"
          value={memory.tonePreference ?? ""}
          onChange={(v) => setMemory({ tonePreference: v || undefined })}
          placeholder="Warm, brief, slightly formal"
        />
      </div>

      <ListField
        label="Companies"
        value={memory.companies}
        onChange={(v) => setMemory({ companies: v })}
        placeholder={"One per line\nE.g. Habitat VIP Travel\nErguvan Turizm"}
      />
      <ListField
        label="Key customers"
        value={memory.keyCustomers}
        onChange={(v) => setMemory({ keyCustomers: v })}
        placeholder={"One per line"}
      />
      <ListField
        label="Projects"
        value={memory.projects}
        onChange={(v) => setMemory({ projects: v })}
        placeholder={"One per line"}
      />
      <ListField
        label="Important markets"
        value={memory.importantMarkets}
        onChange={(v) => setMemory({ importantMarkets: v })}
        placeholder={"One per line · e.g. European luxury · Germany · UK"}
      />

      <TextAreaField
        label="Communication rules"
        value={memory.communicationRules}
        onChange={(v) => setMemory({ communicationRules: v })}
        placeholder="How should Operator write? Any do's and don'ts?"
      />
      <TextAreaField
        label="Things Operator should remember"
        value={memory.rememberThese}
        onChange={(v) => setMemory({ rememberThese: v })}
        placeholder="Recurring context, preferences, decisions Operator should keep in mind."
      />
      <TextAreaField
        label="Things Operator should avoid"
        value={memory.avoidThese}
        onChange={(v) => setMemory({ avoidThese: v })}
        placeholder="Topics, phrases, channels, customers Operator should NOT touch without asking."
      />

      <footer className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5 text-[12.5px] font-medium text-white/85 transition hover:bg-white/[0.08]"
        >
          <Download className="h-3.5 w-3.5" /> Export JSON
        </button>
        <button
          type="button"
          onClick={onImportClick}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5 text-[12.5px] font-medium text-white/85 transition hover:bg-white/[0.08]"
        >
          <Upload className="h-3.5 w-3.5" /> Import JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={onImportFile}
          className="hidden"
        />
        <button
          type="button"
          onClick={onReset}
          disabled={fieldCount === 0}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] text-white/45 transition hover:bg-rose-500/[0.06] hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" /> Reset memory
        </button>
      </footer>

      {error && (
        <p className="rounded-lg bg-rose-500/[0.08] px-3 py-2 text-[12.5px] text-rose-200">{error}</p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Field atoms
// ---------------------------------------------------------------------------

function TextField({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] text-white/50">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-md bg-white/[0.04] px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:bg-white/[0.06] focus:outline-none"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] text-white/50">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="min-h-[72px] rounded-md bg-white/[0.04] px-3 py-2 text-[13px] leading-relaxed text-white placeholder:text-white/30 focus:bg-white/[0.06] focus:outline-none"
      />
    </label>
  );
}

function ListField({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  // Edit as a multiline string; persist as a string[] on blur.
  const [draft, setDraft] = useState<string>(value.join("\n"));
  // Re-sync the draft when the underlying array changes (e.g. import).
  const joinedValue = value.join("\n");
  if (draft !== joinedValue && document.activeElement?.getAttribute("data-list-label") !== label) {
    // not focused → safe to update
    setTimeout(() => setDraft(joinedValue), 0);
  }
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] text-white/50">{label}</span>
      <textarea
        data-list-label={label}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const parsed = draft
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);
          onChange(parsed);
        }}
        placeholder={placeholder}
        rows={3}
        className="min-h-[72px] rounded-md bg-white/[0.04] px-3 py-2 font-mono text-[12.5px] text-white placeholder:text-white/30 focus:bg-white/[0.06] focus:outline-none"
      />
    </label>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countFields(m: FounderMemory): number {
  let n = 0;
  if (m.firstName?.trim()) n++;
  if (m.fullName?.trim()) n++;
  if (m.preferredLanguage?.trim()) n++;
  if (m.tonePreference?.trim()) n++;
  if (m.companies.length > 0) n++;
  if (m.keyCustomers.length > 0) n++;
  if (m.projects.length > 0) n++;
  if (m.importantMarkets.length > 0) n++;
  if (m.communicationRules.trim()) n++;
  if (m.rememberThese.trim()) n++;
  if (m.avoidThese.trim()) n++;
  return n;
}

function formatAgo(ts: number): string {
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diff < 60) return `saved ${diff}s ago`;
  if (diff < 3600) return `saved ${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `saved ${Math.floor(diff / 3600)}h ago`;
  return `saved ${Math.floor(diff / 86400)}d ago`;
}

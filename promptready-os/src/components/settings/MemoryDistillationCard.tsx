"use client";

/**
 * Memory Distillation · Settings card.
 *
 * Silent while memory needs no cleanup — only appears once there's a
 * duplicate, a possible contradiction, or a fact that hasn't come up
 * again in a long time. Nothing here ever changes memory on its own;
 * every row is a question, not an action. Keep confirms a note is
 * still true (resets its age); Archive stops it from feeding drafts
 * without deleting it (reversible via Keep); Forget removes it from
 * drafts for good and blocks the underlying fact from being silently
 * re-learned.
 */

import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { useOperatorMemoryStore } from "@/store/operatorMemory";
import { useMemoryCandidatesStore } from "@/store/memoryCandidates";
import { useMemoryNotesStore } from "@/store/memoryNotes";
import { deriveNotes, computeMemorySuggestions, forgetNote, type MemorySuggestion } from "@/services/memory/distillation";

export function MemoryDistillationCard() {
  const memory = useOperatorMemoryStore((s) => s.memory);
  const candidates = useMemoryCandidatesStore((s) => s.candidates);
  const overrides = useMemoryNotesStore((s) => s.overrides);
  const keep = useMemoryNotesStore((s) => s.keep);
  const archive = useMemoryNotesStore((s) => s.archive);

  const suggestions = useMemo(() => {
    const now = Date.now();
    return computeMemorySuggestions(deriveNotes(memory, candidates, overrides, now));
  }, [memory, candidates, overrides]);

  if (suggestions.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-white/[0.025] p-5">
      <header className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-[0.15em] text-white/40">Memory</span>
        <h2 className="text-[16px] font-semibold tracking-tight text-white">
          <Sparkles className="mr-2 inline h-4 w-4 -translate-y-px text-white/65" />
          {suggestions.length} note{suggestions.length === 1 ? "" : "s"} worth a second look
        </h2>
        <p className="text-[12.5px] leading-relaxed text-white/55">
          Nothing changes until you decide. Keep confirms it&apos;s still true, Archive stops it from being used
          without deleting it, Forget removes it for good.
        </p>
      </header>
      <ul className="flex flex-col gap-2">
        {suggestions.map((s) => (
          <SuggestionRow
            key={s.noteId}
            suggestion={s}
            onKeep={() => keep(s.noteId)}
            onArchive={() => archive(s.noteId)}
            onForget={() => forgetNote(s.noteId, s.sourceKey)}
          />
        ))}
      </ul>
    </section>
  );
}

function SuggestionRow({
  suggestion,
  onKeep,
  onArchive,
  onForget
}: {
  suggestion: MemorySuggestion;
  onKeep: () => void;
  onArchive: () => void;
  onForget: () => void;
}) {
  return (
    <li className="flex flex-col gap-1.5 rounded-lg bg-white/[0.02] px-3 py-2.5">
      <p className="text-[12.5px] leading-relaxed text-white/85">&quot;{suggestion.text}&quot;</p>
      <p className="text-[11.5px] text-white/45">{suggestion.reason}</p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onKeep}
          className="rounded-full bg-white px-3 py-1 text-[11.5px] font-semibold text-black transition hover:bg-white/90"
        >
          Keep
        </button>
        <button
          type="button"
          onClick={onArchive}
          className="rounded-full bg-white/[0.05] px-3 py-1 text-[11.5px] text-white/80 transition hover:bg-white/[0.08]"
        >
          Archive
        </button>
        <button
          type="button"
          onClick={onForget}
          className="rounded-full px-3 py-1 text-[11.5px] text-white/45 transition hover:text-white/75"
        >
          Forget
        </button>
      </div>
    </li>
  );
}

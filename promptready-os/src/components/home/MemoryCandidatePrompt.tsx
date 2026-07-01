"use client";

/**
 * Memory candidates · "I noticed this. Save to memory?"
 *
 * Nothing here is ever saved silently. Every candidate is a specific
 * fact from a real event, waiting for a founder decision: Save,
 * Ignore (ask again if it comes up again), or Never remember this
 * (permanent). Capped to 3 at a time so this stays a quiet notice, not
 * a queue to manage.
 */

import { useMemoryCandidatesStore } from "@/store/memoryCandidates";

const MAX_SHOWN = 3;

export function MemoryCandidatePrompt() {
  const pending = useMemoryCandidatesStore((s) => s.pendingCandidates());
  const save = useMemoryCandidatesStore((s) => s.save);
  const ignore = useMemoryCandidatesStore((s) => s.ignore);
  const block = useMemoryCandidatesStore((s) => s.block);

  if (pending.length === 0) return null;

  return (
    <section className="flex flex-col gap-2 rounded-xl bg-white/[0.018] p-4">
      <p className="text-[13px] font-medium text-white">I noticed this. Save to memory?</p>
      <ul className="flex flex-col gap-2">
        {pending.slice(0, MAX_SHOWN).map((c) => (
          <li key={c.key} className="flex flex-col gap-1.5 rounded-lg bg-white/[0.02] px-3 py-2.5">
            <p className="text-[12.5px] leading-relaxed text-white/85">&quot;{c.text}&quot;</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => save(c.key)}
                className="rounded-full bg-white px-3 py-1 text-[11.5px] font-semibold text-black transition hover:bg-white/90"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => ignore(c.key)}
                className="rounded-full bg-white/[0.05] px-3 py-1 text-[11.5px] text-white/80 transition hover:bg-white/[0.08]"
              >
                Ignore
              </button>
              <button
                type="button"
                onClick={() => block(c.key)}
                className="rounded-full px-3 py-1 text-[11.5px] text-white/45 transition hover:text-white/75"
              >
                Never remember this
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

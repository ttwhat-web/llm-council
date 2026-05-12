/**
 * Banner shown on /privacy + /terms when the matching
 * LEGAL_*_REVIEWED flag is still false.
 *
 * Visible to everyone — the spec calls for the page to render even
 * when copy isn't counsel-reviewed yet, but to warn readers that
 * what they see is a draft. The launch checklist surfaces this as a
 * BLOCKER for `public` launch mode separately.
 */

interface Props {
  flag: "LEGAL_PRIVACY_REVIEWED" | "LEGAL_TERMS_REVIEWED";
  document: "privacy notice" | "terms of service";
}

export function LegalPlaceholderBanner({ flag, document: doc }: Props) {
  const reviewed = (process.env[flag] || "").toLowerCase() === "true";
  if (reviewed) return null;
  return (
    <div className="mb-6 rounded-2xl border border-amber-400/35 bg-amber-500/[0.06] px-4 py-3 text-[12px] leading-relaxed text-amber-100">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300">
        draft
      </span>{" "}
      This {doc} is structural placeholder copy and has not yet been reviewed by
      counsel. We do not rely on it as our authoritative {doc} until the
      operator flips <code>{flag}=true</code>.
    </div>
  );
}

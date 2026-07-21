/**
 * Launch-mode badge.
 *
 *   dev           → no badge (silent in local dev)
 *   private_beta  → amber "Private beta" chip
 *   public        → no badge (clean conversion UI)
 *
 * Reads NEXT_PUBLIC_LAUNCH_MODE at module load. Server component so
 * the chip renders without a client roundtrip — every marketing page
 * and Mission Control can drop it in.
 */

const MODE = (
  process.env.NEXT_PUBLIC_LAUNCH_MODE || "dev"
).toLowerCase() as "dev" | "private_beta" | "public" | string;

export function LaunchBadge({ compact }: { compact?: boolean } = {}) {
  if (MODE !== "private_beta") return null;
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-md border border-amber-400/35 bg-amber-500/[0.08] px-2 py-0.5 font-mono uppercase tracking-[0.18em] text-amber-200 " +
        (compact ? "text-[9px]" : "text-[10px]")
      }
      title="operator.center is in private beta"
    >
      <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-amber-300">
        <span className="absolute inset-0 animate-ping rounded-full bg-amber-300/55" />
      </span>
      private beta
    </span>
  );
}

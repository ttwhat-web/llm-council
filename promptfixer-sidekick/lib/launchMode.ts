/**
 * Launch mode + founder-launch flags.
 *
 * Two server-readable, browser-readable flags drive every gating
 * decision the UI makes outside Mission Control itself:
 *
 *   NEXT_PUBLIC_LAUNCH_MODE = "dev" | "private_beta" | "public"
 *     - dev           default. Internal warnings visible. No beta badge.
 *     - private_beta  Beta badge in nav + Mission Control. Internal
 *                     warnings still visible (we want to know in beta).
 *     - public        Production launch. Internal warnings hidden from
 *                     non-admin viewers; conversion copy clean.
 *
 *   FOUNDER_LAUNCH_ENABLED = "true" | "false"
 *     - false  hides the founder lifetime CTA entirely (everywhere).
 *     - true   founder CTA visible until the cap is hit, then sold-out.
 *
 * Both are intentionally string envs (not booleans-as-numbers) so they
 * survive Vercel's env editor without surprises.
 */

export type LaunchMode = "dev" | "private_beta" | "public";

export function launchMode(): LaunchMode {
  const raw = (process.env.NEXT_PUBLIC_LAUNCH_MODE || "").toLowerCase();
  if (raw === "public") return "public";
  if (raw === "private_beta" || raw === "private-beta" || raw === "beta") {
    return "private_beta";
  }
  return "dev";
}

export function isPublicLaunch(): boolean {
  return launchMode() === "public";
}

export function isPrivateBeta(): boolean {
  return launchMode() === "private_beta";
}

export function founderLaunchEnabled(): boolean {
  return (process.env.FOUNDER_LAUNCH_ENABLED || "").toLowerCase() === "true";
}

/** Pure inspection — surfaced through `/api/health/full`. */
export function launchModeSnapshot() {
  return {
    mode: launchMode(),
    founderLaunch: founderLaunchEnabled()
  };
}

/**
 * Runtime configuration for the DerinSplit WebView shell.
 *
 * The web URL is read from `EXPO_PUBLIC_DERINSPLIT_URL` so production
 * builds (EAS / Expo Go) point at the deployed Vercel preview without
 * code changes. Anything prefixed with `EXPO_PUBLIC_` is inlined at
 * build time on every JS bundle.
 */

const RAW_URL = (process.env.EXPO_PUBLIC_DERINSPLIT_URL ?? '').trim();

/** Set to `null` when no URL is configured — UI surfaces a friendly error. */
export const DERINSPLIT_URL: string | null = RAW_URL.length > 0 ? RAW_URL : null;

export const USER_AGENT_SUFFIX =
  (process.env.EXPO_PUBLIC_USER_AGENT_SUFFIX ?? '').trim() ||
  'DerinSplit-Mobile/1.0';

// ── Brand tokens (kept in lock-step with the web's globals.css) ────────────

export const COLORS = {
  bg: '#06070A',
  bgSoft: '#0E0D0A',
  ink: '#F5F1E8',
  inkSecondary: 'rgba(245,241,232,0.72)',
  inkTertiary: 'rgba(245,241,232,0.45)',
  gold: '#C8A24A',
  goldLight: '#E8C879',
  goldDark: '#8E6F2C',
  error: '#D97373',
} as const;

/** Domains the WebView is allowed to load in-place. Everything else
 *  bounces to the system browser. */
export function isAllowedOrigin(url: string): boolean {
  if (!DERINSPLIT_URL) return false;
  try {
    const target = new URL(DERINSPLIT_URL);
    const candidate = new URL(url);
    return target.hostname === candidate.hostname;
  } catch {
    return false;
  }
}

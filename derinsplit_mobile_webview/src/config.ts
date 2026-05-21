/**
 * Runtime configuration for the DerinSplit WebView shell.
 *
 * The app simply opens the LIVE site — no local catalog, no mock data.
 * `EXPO_PUBLIC_DERINSPLIT_URL` can override the target (e.g. a staging
 * domain) but defaults to production so the app works out of the box.
 */

const DEFAULT_URL = 'https://derinsplit.com/login?callbackUrl=/';

const RAW_URL = (process.env.EXPO_PUBLIC_DERINSPLIT_URL ?? '').trim();

/** Live site URL the WebView opens. Falls back to production. */
export const DERINSPLIT_URL: string = RAW_URL.length > 0 ? RAW_URL : DEFAULT_URL;

export const USER_AGENT_SUFFIX =
  (process.env.EXPO_PUBLIC_USER_AGENT_SUFFIX ?? '').trim() ||
  'DerinSplit-Mobile/1.0';

// ── Brand tokens (only used by the short loading / error chrome) ───────────

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

/**
 * In-app navigation is allowed only within the DerinSplit registrable
 * domain (covers `derinsplit.com`, `www.derinsplit.com`, any subdomain).
 * Everything else opens in the system browser.
 */
export function isAllowedOrigin(url: string): boolean {
  try {
    const base = registrableDomain(new URL(DERINSPLIT_URL).hostname);
    const candidate = registrableDomain(new URL(url).hostname);
    return base.length > 0 && base === candidate;
  } catch {
    return false;
  }
}

/** Last two labels of a hostname, e.g. www.derinsplit.com → derinsplit.com */
function registrableDomain(hostname: string): string {
  const parts = hostname.toLowerCase().split('.').filter(Boolean);
  if (parts.length <= 2) return parts.join('.');
  return parts.slice(-2).join('.');
}

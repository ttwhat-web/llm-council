/**
 * Lightweight in-memory token-bucket rate limiter.
 *
 * Used by billing-sensitive API routes (checkout, webhook, the four
 * cloud-bound generation routes) to absorb bursts without paging the
 * provider. Independent of the daily quota — a Pro user with unlimited
 * fixes still gets rate-limited if they fire 200 requests in a second.
 *
 * NOT distributed: a single Map per server process. Replace with
 * Upstash / Vercel KV / Redis the same time `lib/billing/server.ts`'s
 * STORE goes server-side. See BILLING.md.
 */

interface Bucket {
  tokens: number;
  /** ms epoch of the last refill. */
  refilledAt: number;
}

interface BucketConfig {
  /** Bucket size — also the burst capacity. */
  capacity: number;
  /** Token refill rate, tokens per second (fractional ok). */
  refillRate: number;
}

const STORE = new Map<string, Bucket>();

export interface RateDecision {
  allowed: boolean;
  /** Tokens remaining after the decision. */
  remaining: number;
  /** Seconds until next token if denied. */
  retryAfter?: number;
}

/**
 * Consume `cost` tokens from a named bucket. Creates the bucket on
 * first sight at full capacity.
 */
export function consumeTokens(
  key: string,
  config: BucketConfig,
  cost = 1,
  now = Date.now()
): RateDecision {
  let b = STORE.get(key);
  if (!b) {
    b = { tokens: config.capacity, refilledAt: now };
    STORE.set(key, b);
  } else {
    const elapsed = (now - b.refilledAt) / 1000;
    if (elapsed > 0) {
      b.tokens = Math.min(config.capacity, b.tokens + elapsed * config.refillRate);
      b.refilledAt = now;
    }
  }

  if (b.tokens < cost) {
    const deficit = cost - b.tokens;
    const retryAfter = config.refillRate > 0 ? deficit / config.refillRate : 1;
    return { allowed: false, remaining: Math.floor(b.tokens), retryAfter };
  }

  b.tokens -= cost;
  return { allowed: true, remaining: Math.floor(b.tokens) };
}

// Standard policies the routes pull from. Tune via env when we wire
// real load tests.
export const POLICIES = {
  /** Cloud-bound generation: 30 req / min, burst 8. */
  cloudGenerate: { capacity: 8, refillRate: 30 / 60 },
  /** Billing endpoints: 12 req / min. Tighter — these are write-prone. */
  billingMutation: { capacity: 6, refillRate: 12 / 60 }
} as const satisfies Record<string, BucketConfig>;

/** Test hook — drop everything. Never call from production code paths. */
export function __resetRateLimiter(): void {
  STORE.clear();
}

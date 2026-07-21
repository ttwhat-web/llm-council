# Billing — Phase 5 architecture

This document is the contract between the server billing module
(`lib/billing/`), the auth seam (`lib/auth/`), the cloud-bound API
routes that consume them, and the eventual real-money payment
integration.

The current implementation is a **stub**. There is no Stripe or Paddle
key in the codebase. Free and Pro are real on the server though — the
quota is enforced regardless of what the browser believes, and durable
across restarts when the file store is enabled.

---

## 1. Building blocks

```
lib/auth/
└── identity.ts     resolveAuthenticatedUser(req) — auth seam.
                    Today: NODE_ENV != production → x-user-email header.
                    Future: Clerk / Auth.js / JWT.

lib/billing/
├── types.ts        Plan / Identity / FeatureKey / snapshot shapes
├── plans.ts        PLANS catalogue (free / pro / team / enterprise)
├── store.ts        BillingStore interface + factory + entity types
│                   (Customer, Subscription, UsageRecord, AuditEvent)
├── memory-store.ts in-memory implementation (tests + prod fallback)
├── file-store.ts   JSON-file backed dev store with atomic writes
├── server.ts       resolveUserIdentity, resolvePlan, runBillingGate,
│                   peek/incrementUsage, dev cookie sign/verify,
│                   security helpers — ALL store-backed
└── rateLimit.ts    in-memory token bucket (still process-local)
```

Routes:

| Route                    | Method  | Purpose                                                |
| ------------------------ | ------- | ------------------------------------------------------ |
| `/api/billing/me`        | GET     | Returns identity, plan, quota, features, mode, source. |
| `/api/billing/checkout`  | POST    | Stub: signs a dev-override cookie + audit event.       |
| `/api/billing/webhook`   | POST    | Stub: verifies signature when secret is configured.    |
| `/api/billing/debug`     | GET/POST| **Dev only** — dumps the store, grants/revokes plans.  |
| `/api/fix`               | POST    | Cloud-bound. Gated.                                    |
| `/api/architect`         | POST    | Cloud-bound. Gated.                                    |
| `/api/skills/run`        | POST    | Cloud-bound for `prompt-fixer` & `architect`. Gated.   |
| `/api/workflows/run`     | POST    | Workflow-level gate.                                   |

---

## 2. Identity resolution

`resolveUserIdentity(req)` picks the caller in this order:

1. **Authenticated user** via `lib/auth/identity.ts → resolveAuthenticatedUser`.
   Today this only honours an `x-user-email` header when both
   `NODE_ENV !== "production"` AND `ALLOW_DEV_USER_HEADER=true`.
   Production NEVER trusts that header — even if the env is set.
   Future Clerk / Auth.js / JWT integration is added in the same file
   ahead of the dev-header branch.
2. **Anonymous session cookie** (`pf_session`). Auto-issued the first
   time we see a request without one. HttpOnly, SameSite=Lax, secure
   in production. 1-year TTL.

Everything else (rate limit buckets, quota counters, dev-override
cookies, store records) is keyed off `identity.id`.

---

## 3. Plan resolution

`resolvePlan(req, identity)` returns `{ plan, source }`:

1. **Stored Subscription** — look up `getCustomerByIdentity(id)` →
   `getSubscription(customerId)`. If status ∈ {`active`,`trialing`}
   AND `currentPeriodEnd` (when present) is in the future, return that
   plan. `source` becomes `"auth"` for `stripe`/`paddle`/`auth`
   subscriptions, `"dev-override"` for debug grants.
2. **Signed dev override cookie** (`pf_billing_dev`) →
   `{ plan, source: "dev-override" }`.
3. **Default** → `{ plan: "free", source: "default" }`.

`/api/billing/checkout` (stub) issues the dev cookie. Debug grants and
Stripe / Paddle webhooks write Customer + Subscription rows to the
store and override the cookie path automatically.

---

## 4. Gating

Every cloud-bound route opens with:

```ts
const gate = await runBillingGate(req, {
  rateLimit: "cloudGenerate",
  action: "cloud-fix",
  consume: willHitCloud
});
if (!gate.ok) return gate.errorResponse!;
// ...
return gate.attach(NextResponse.json(payload, { headers }));
```

`runBillingGate` does, in order:

1. Resolve identity (auto-issues session cookie).
2. Resolve plan (dev override → default).
3. Apply the requested rate-limit policy (token bucket).
4. Optionally enforce a feature flag.
5. Optionally consume a quota unit (fails 429 when over the daily cap).

The route MUST call `gate.attach(response)` on whatever response it
returns so cookies (session, dev-override) actually ride out.

---

## 5. Quota & rate limit

| Concern             | Lives in                                       | Default                |
| ------------------- | ---------------------------------------------- | ---------------------- |
| Daily cloud-fix cap | `BillingStore.{getUsage,incrementUsage}`       | Free: 10/day · Pro+: ∞ |
| Burst smoothing     | `rateLimit.ts → STORE` (in-memory, per process)| 8 burst, 30/min refill |

The quota counter is **durable** when the file store is enabled (see
§5a). The rate-limit buckets remain process-local — that's fine for
single-instance deploys; KV-backed sliding-window counters land when
the rest of the store does.

> **Production swap:** replace both Maps with Upstash / Vercel KV /
> Redis. The function shapes (`getUsage`, `incrementUsage`,
> `consumeTokens`) stay the same — only the storage handle changes.

### 5a. The store

`BillingStore` (`lib/billing/store.ts`) is the single seam between
billing logic and storage.

```ts
interface BillingStore {
  getCustomerByIdentity(identityKey): Promise<Customer | null>;
  upsertCustomer(customer): Promise<Customer>;
  getSubscription(customerId): Promise<Subscription | null>;
  upsertSubscription(sub): Promise<Subscription>;
  deleteSubscription(customerId): Promise<void>;

  getUsage(identityKey, action, dateKey): Promise<UsageRecord | null>;
  incrementUsage(identityKey, action, dateKey): Promise<UsageRecord>;
  resetUsage(identityKey, action, dateKey): Promise<void>;

  getAuditEvents(identityKey?, limit?): Promise<BillingAuditEvent[]>;
  appendAuditEvent(event): Promise<BillingAuditEvent>;
}
```

Implementations:

| Kind     | When used                                  | Notes                              |
| -------- | ------------------------------------------ | ---------------------------------- |
| `memory` | `BILLING_STORE=memory` or NODE_ENV=production default | Resets on deploy. Tests + fallback. |
| `file`   | `BILLING_STORE=file` or dev default        | Atomic writes to `BILLING_STORE_FILE` (default `.promptfixer/billing-store.json`). Single-host only. |
| `kv`     | reserved                                   | Drop in next.                      |
| `postgres`| reserved                                  | Drop in next.                      |

Audit events (`appendAuditEvent`) fire on:
- `checkout-stub` — stub checkout completion
- `grant` / `revoke` — debug-route plan changes
- `subscription-upserted` — webhook upserts (when wired)
- `usage-exceeded` — quota gate denials
- `rate-limited` — token-bucket denials

The audit log is capped (memory: 500, file: 1000) and trimmed FIFO.

### 5b. Debug route

`GET /api/billing/debug` (dev only) dumps customers, subscriptions,
usage, recent audit events, and the caller's snapshot.

`POST /api/billing/debug` accepts `{ action }`:

```bash
# Grant Pro to the current session
curl -i -c jar -b jar -X POST http://localhost:3030/api/billing/debug \
  -H 'content-type: application/json' \
  -d '{"action":"grant_pro"}'

# Confirm
curl -b jar http://localhost:3030/api/billing/me     # plan === "pro"

# Reset today's usage counter (free quota recovery)
curl -b jar -X POST http://localhost:3030/api/billing/debug \
  -H 'content-type: application/json' \
  -d '{"action":"reset_usage"}'

# Revoke
curl -b jar -X POST http://localhost:3030/api/billing/debug \
  -H 'content-type: application/json' \
  -d '{"action":"revoke"}'
```

Both methods return 404 in production.

---

## 6. Wiring real Stripe / Paddle

Three changes:

**a. `/api/billing/checkout`**

When `BILLING_PROVIDER === "stripe"`:

```ts
const session = await stripe.checkout.sessions.create({
  mode: "subscription",
  line_items: [{ price: PRICE_PRO_MONTHLY, quantity: 1 }],
  success_url: `${origin}/?billing=success`,
  cancel_url: `${origin}/?billing=cancel`,
  customer_email: identity.email,
  client_reference_id: identity.id,
  metadata: { plan: "pro" }
});
return NextResponse.json({ ok: true, mode: "stripe", url: session.url });
```

The browser redirects to the URL.

**b. `/api/billing/webhook`**

```ts
const event = stripe.webhooks.constructEvent(raw, sig, BILLING_WEBHOOK_SECRET);
const store = await getBillingStore();
switch (event.type) {
  case "customer.subscription.created":
  case "customer.subscription.updated": {
    const sub = event.data.object;
    const customer = await store.upsertCustomer({
      id: newCustomerId(),
      identityKey: `email:${sub.customer_email}`,
      email: sub.customer_email,
      externalId: sub.customer,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    await store.upsertSubscription({
      id: newSubscriptionId(),
      customerId: customer.id,
      plan: planFromPrice(sub.items.data[0].price.id),
      status: sub.status, // "active" | "trialing" | "past_due" | …
      source: "stripe",
      externalId: sub.id,
      currentPeriodEnd: sub.current_period_end * 1000,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    void store.appendAuditEvent({
      kind: "subscription-upserted",
      identityKey: customer.identityKey,
      customerId: customer.id,
      plan: planFromPrice(sub.items.data[0].price.id),
      detail: `${event.type} → ${sub.status}`
    });
    break;
  }
  case "customer.subscription.deleted": {
    const sub = event.data.object;
    const customer = await store.getCustomerByIdentity(`email:${sub.customer_email}`);
    if (customer) await store.deleteSubscription(customer.id);
    break;
  }
  case "invoice.payment_failed":
    /* fire Mission Alert + grace window */
    break;
}
```

Idempotency: dedupe by `event.id`. Stripe WILL retry on non-2xx.

**c. `lib/billing/server.ts → resolvePlan`** is already store-backed
as of Phase 5. Real subscriptions written by the webhook above are
picked up on the next request — no further code changes.

---

## 7. Replacing the file/memory stores

`BillingStore` is the one seam to swap. Drop a new implementation
into `lib/billing/` and have `getBillingStore()` return it when
`BILLING_STORE` matches.

| Backend  | Notes                                                           |
| -------- | --------------------------------------------------------------- |
| Upstash  | Serverless-friendly, TTL-native, HTTP API. Drop-in for usage + audit. |
| Vercel KV| Same shape on Vercel.                                           |
| Postgres | `customers`, `subscriptions`, `usage_daily(identity, day, action)`, `billing_audit`. |

The rate limiter still lives in `rateLimit.ts → STORE` as an in-process
`Map`. Replace alongside the store with a sliding-window or
token-bucket Lua against the same backend.

---

## 8. Security notes

- **Cookies**: `pf_session` and `pf_billing_dev` are HttpOnly,
  SameSite=Lax, `secure` in production. Browser JS cannot read them.
- **Dev override**: the cookie is HMAC-SHA256 signed and bound to the
  identity. A stolen cookie can't be replayed against another session.
- **Webhook**: `verifyHmac` uses `timingSafeEqual` against the
  configured secret. Real Stripe wiring should swap this for
  `stripe.webhooks.constructEvent`.
- **Body size**: every billing-sensitive route declines payloads above
  `requestExceedsSize(req, MAX_BODY_BYTES)`.
- **Errors**: `billingErrorResponse(code, message, status)` is the only
  error helper. It never leaks stack traces. Internal exceptions inside
  route handlers are caught at the framework level and surfaced as
  generic 500s.

---

## 9. How to test

| Scenario          | Steps                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| Free quota        | Open the app. Run `/api/fix` 10 times. The 11th returns 429 with `code: "quota_exceeded"`.     |
| Pro stub          | `export BILLING_DEV_OVERRIDE_SECRET=$(openssl rand -hex 32)` → restart → click **Use Pro Preview**. The chip turns into "Pro · unlimited" with a "Local preview" badge. The 11th run succeeds. |
| Pro via grant     | `curl -c jar -b jar -X POST localhost:3030/api/billing/debug -d '{"action":"grant_pro"}'` writes a Subscription to the store. `/api/billing/me` now returns `plan: "pro"` durably. |
| Reset usage       | `curl -b jar -X POST localhost:3030/api/billing/debug -d '{"action":"reset_usage"}'` empties today's counter. The chip flips back to 0/10. |
| Revoke            | `curl -b jar -X POST localhost:3030/api/billing/debug -d '{"action":"revoke"}'` deletes the Subscription. Plan resolves to `free` again. |
| Quota across tabs | Run 10 fixes in tab A. Open tab B (same browser session). The chip in B already shows 10/10.   |
| Rate limit        | Fire 9+ POSTs to `/api/skills/run` within ~5s. The 9th returns 429 with `code: "rate_limited"`.|
| Persistence       | With `BILLING_STORE=file`, hit any of the above, restart the dev server, repeat the GET — state is intact. |
| Webhook stub      | `curl -X POST /api/billing/webhook -H 'x-pf-signature: <hmac>' -d '{}'` with the right secret. |

---

## 10. Open items before real launch

1. Live auth provider (Clerk / Auth.js / JWT) wired into
   `lib/auth/identity.ts → resolveAuthenticatedUser`. Drop the
   `ALLOW_DEV_USER_HEADER` branch in production.
2. Live Stripe / Paddle keys + price ids; the upsert pattern in §6 is
   already store-aware.
3. KV / Postgres `BillingStore` implementation (§7).
4. KV-backed rate limiter (sliding-window) replacing
   `rateLimit.ts → STORE`.
5. Plan-change emails (welcome, downgrade, dunning).
6. Webhook idempotency table (`event.id` → seen).
7. EU VAT handling at checkout.
8. Customer portal route (`/api/billing/portal`) for Stripe.

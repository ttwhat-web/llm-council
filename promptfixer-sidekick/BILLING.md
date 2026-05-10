# Billing — Phase 4 architecture

This document is the contract between the server billing module
(`lib/billing/`), the four cloud-bound API routes that consume it, and
the eventual real-money payment integration.

The current implementation is a **stub**. There is no Stripe or Paddle
key in the codebase. Free and Pro are real on the server though — the
quota is enforced regardless of what the browser believes.

---

## 1. Building blocks

```
lib/billing/
├── types.ts        Plan / Identity / FeatureKey / snapshot shapes
├── plans.ts        PLANS catalogue (free / pro / team / enterprise)
├── server.ts       resolveUserIdentity, dev cookie sign/verify,
│                   quota store, runBillingGate, security helpers
└── rateLimit.ts    in-memory token bucket
```

Routes:

| Route                    | Method | Purpose                                                |
| ------------------------ | ------ | ------------------------------------------------------ |
| `/api/billing/me`        | GET    | Returns identity, plan, quota, features, mode, source. |
| `/api/billing/checkout`  | POST   | Stub: signs a dev-override cookie.                     |
| `/api/billing/webhook`   | POST   | Stub: verifies signature when secret is configured.    |
| `/api/fix`               | POST   | Cloud-bound. Gated.                                    |
| `/api/architect`         | POST   | Cloud-bound. Gated.                                    |
| `/api/skills/run`        | POST   | Cloud-bound for `prompt-fixer` & `architect`. Gated.   |
| `/api/workflows/run`     | POST   | Workflow-level gate.                                   |

---

## 2. Identity resolution

`resolveUserIdentity(req)` picks the caller in this order:

1. **Authenticated email** — only when `ALLOW_DEV_USER_HEADER=true` and
   the request carries `x-user-email`. Production should swap this for
   a real auth provider (Clerk, Auth.js, custom JWT) in the same
   function. Leave the flag off in prod.
2. **Anonymous session cookie** (`pf_session`). Auto-issued the first
   time we see a request without one. HttpOnly, SameSite=Lax, secure
   in production. 1-year TTL.

Everything else (rate limit buckets, quota counters, dev-override
cookies) is keyed off `identity.id`.

---

## 3. Plan resolution

`resolvePlan(req, identity)` returns `{ plan, source }`:

1. Signed dev override cookie (`pf_billing_dev`) → `{ plan, source: "dev-override" }`.
2. Default → `{ plan: "free", source: "default" }`.

When real auth + Stripe land, step 0 becomes:

> Look up `customer_id → plan` in the durable subscription store. Return
> `{ plan, source: "auth" }`.

The webhook is what writes that store. See §6.

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

| Concern             | Lives in                  | Default                     |
| ------------------- | ------------------------- | --------------------------- |
| Daily cloud-fix cap | `server.ts → USAGE_STORE` | Free: 10/day · Pro+: ∞      |
| Burst smoothing     | `rateLimit.ts → STORE`    | 8 burst, 30/min refill      |

Both are in-memory `Map`s. They reset on deploy. Single-instance only.

> **Production swap:** replace both Maps with Upstash / Vercel KV /
> Redis. The function shapes (`peekUsage`, `incrementUsage`,
> `consumeTokens`) stay the same — only the storage handle changes.

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
switch (event.type) {
  case "customer.subscription.created":
  case "customer.subscription.updated":
    await subscriptionStore.upsert({
      identityId: event.data.object.client_reference_id,
      plan: planFromPrice(event.data.object.items.data[0].price.id),
      source: "auth",
      expiresAt: event.data.object.current_period_end * 1000
    });
    break;
  case "customer.subscription.deleted":
    await subscriptionStore.upsert({ identityId, plan: "free", source: "auth" });
    break;
  case "invoice.payment_failed":
    /* fire Mission Alert + grace window */
    break;
}
```

Idempotency: dedupe by `event.id`. Stripe WILL retry on non-2xx.

**c. `lib/billing/server.ts → resolvePlan`**

```ts
const sub = await subscriptionStore.get(identity.id);
if (sub && sub.plan !== "free" && sub.expiresAt > Date.now()) {
  return { plan: sub.plan, source: "auth" };
}
```

Add this lookup as the first branch — ahead of the dev-override cookie.

---

## 7. Replacing the in-memory stores

The two `Map`s live in `lib/billing/server.ts → USAGE_STORE` and
`lib/billing/rateLimit.ts → STORE`. Replacement targets, in order of
preference:

1. **Upstash Redis** — serverless-friendly, TTL-native, HTTP API.
   Drop-in for both stores. `INCR` for usage, sliding-window or
   token-bucket Lua for rate limit.
2. **Vercel KV** — same shape if you're already on Vercel.
3. **Postgres** — if you already host a DB. One `subscriptions` table,
   one `usage_daily(identity_id, day, count)` table.

The function signatures (`peekUsage`, `incrementUsage`,
`consumeTokens`) are deliberately small so the swap is mechanical.

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
| Quota across tabs | Run 10 fixes in tab A. Open tab B (same browser session). The chip in B already shows 10/10.   |
| Rate limit        | Fire 9+ POSTs to `/api/skills/run` within ~5s. The 9th returns 429 with `code: "rate_limited"`.|
| Webhook stub      | `curl -X POST /api/billing/webhook -H 'x-pf-signature: <hmac>' -d '{}'` with the right secret. |

---

## 10. Open items before real launch

1. Real auth provider (replace `x-user-email` dev hook).
2. Live Stripe / Paddle keys + price ids.
3. Subscription store (Upstash / KV / DB).
4. Replace `USAGE_STORE` and rate-limit `STORE` with the same backend.
5. Plan-change emails (welcome, downgrade, dunning).
6. Audit log table for the Team plan.
7. EU VAT handling at checkout.
8. Customer portal route (`/api/billing/portal`) for Stripe.

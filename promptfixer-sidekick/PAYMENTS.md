# Payments — Phase 8 architecture

operator.center is operated from Turkey and intentionally **does not
make Stripe the only payment path**. The product accepts:

- **Stripe** card subscriptions (where the seller has Stripe access)
- **Paddle** as a merchant-of-record (MoR) alternative
- **Lemon Squeezy** as a Turkey-friendly MoR default
- **Crypto** (BTC / USDT / USDC / SOL) via on-chain transfer + manual
  verification
- **Local manual** (Shopier / iyzico / PayTR / wire transfer) — reserved
  abstraction, surfaced today as a free-form bank-transfer flow
- **Stub** — server-signed local override for development

The architecture lets us migrate to an international entity later
without rewriting routes or UI: every payment path goes through the
same provider interface and the same `PaymentRecord` store.

---

## 1. Building blocks

```
lib/payments/
├── types.ts             Provider / Mode / Status / Plan unions +
│                        PaymentRecord + ProviderInfo + checkout result
├── crypto.ts            Network catalogue from env (addresses, warnings)
├── store.ts             PaymentStore interface + factory
├── memory-store.ts      tests + production fallback
├── file-store.ts        atomic JSON dev store
├── upstash-store.ts     production Redis store (HTTP)
├── registry.ts          listProviders / getProvider
└── providers/
    ├── stripe.ts            wraps lib/billing/stripe.ts
    ├── paddle.ts            stub (info only, createCheckout 503s)
    ├── lemon-squeezy.ts     stub (info only, createCheckout 503s)
    ├── crypto-manual.ts     creates pending PaymentRecord + instructions
    ├── local-manual.ts      Turkish bank-transfer manual flow
    └── stub.ts              dev override

lib/billing/founder.ts   countFounderSeats (BillingStore subs +
                         PaymentStore verified records)

lib/admin.ts             requireAdmin gate (dev open; prod allowlist)

app/api/payments/
├── providers/route.ts             GET — dynamic provider catalogue +
│                                  founder snapshot + crypto networks
├── checkout/route.ts              POST — dispatches to any provider
├── crypto/submit/route.ts         POST — user submits tx hash
└── [id]/route.ts                  GET  — public payment view

app/api/admin/payments/
├── route.ts                       GET  — pending queue (admin)
└── [id]/{verify,reject}/route.ts  POST — grant or reject (admin)

app/admin/payments/page.tsx        admin UI
app/launch/page.tsx                launch checklist
app/api/health/full/route.ts       env-presence diagnostics
```

---

## 2. Provider selection

`GET /api/payments/providers` returns the registry filtered by what's
configured in env. The UpgradeModal renders **alternative providers**
underneath the existing Stripe-only plan cards via
`<PaymentsPicker plan={…} />`. Stripe stays on its own flow
(`/api/billing/checkout`) so the existing Phase-6 UX is untouched.

Each `ProviderInfo` carries:
- `enabled` — does this deployment have what it needs?
- `plans` — which PaymentPlanKeys this provider can charge
- `manualVerification` — drives "manual" UI state
- `unavailableReason` — user-visible reason when disabled

---

## 3. Stripe flow

Unchanged from Phase 6. The Stripe provider (`providers/stripe.ts`) is
a thin wrapper that delegates to `lib/billing/stripe.ts` and
`/api/billing/webhook` for subscription lifecycle. The unified
`/api/payments/checkout` can route Stripe-eligible plans through this
provider, but the UpgradeModal's plan cards still call
`/api/billing/checkout` directly because the existing flow already
returns `{ mode: "stripe", url }` and the modal handles redirect.

---

## 4. Paddle flow (stubbed)

`PADDLE_API_KEY` + `PADDLE_WEBHOOK_SECRET` + price ids enable the
provider in `listProviders()`. `createCheckout` currently returns a
clear 503 — TODOs in `providers/paddle.ts` mark exactly what to wire:

1. `paddle.transactions.create({ items, customer_email })` returning
   the hosted-checkout URL.
2. A `/api/payments/paddle/webhook` route mirroring the Stripe webhook
   in shape — verify the `paddle-signature` HMAC, then upsert via
   `BillingStore.upsertCustomer` / `upsertSubscription` with
   `source: "paddle"`.

`countFounderSeats` already pulls Paddle subscriptions through
`BillingStore.listSubscriptions()`, so the cap works the moment Paddle
upserts hit the store.

---

## 5. Lemon Squeezy flow (stubbed)

Same shape as Paddle. `LEMON_SQUEEZY_API_KEY`, `_STORE_ID`,
`_WEBHOOK_SECRET`, plus variant ids per plan. TODOs in
`providers/lemon-squeezy.ts`:

1. POST `/v1/checkouts` with `custom_data.identityKey` so the webhook
   can resolve back.
2. `/api/payments/lemon-squeezy/webhook` verifying `X-Signature` HMAC,
   handling `order_created` (one-shot lifetime) and `subscription_*`
   events.

---

## 6. Crypto manual flow

1. User picks a network in the UpgradeModal payment picker
   (`crypto_manual` provider).
2. `POST /api/payments/checkout` → `crypto-manual.createCheckout`:
   - validates network is enabled (env address present)
   - rejects with `founder_sold_out` if the plan is `founder_lifetime`
     and the cap is hit
   - generates a `PaymentRecord` with status `pending` and a short
     reference (`OC-XXXXXX`)
   - returns `manualInstructions`: address, amount hint, reference,
     strict-network warning, notes
3. UI renders the instructions. User sends the on-chain transfer
   themselves; we never hold a key, never derive an address, never
   call an RPC.
4. User submits the tx hash via `POST /api/payments/crypto/submit`.
   Record flips `pending → submitted`. Owner check enforced server-side.
5. Admin reviews at `/admin/payments`. `POST .../verify` flips the
   record to `verified` AND upserts a Customer + Subscription in
   `BillingStore` via the same code path the Stripe webhook uses.
6. `countFounderSeats` consumes one founder seat; the UI updates on
   the next `/api/payments/providers` fetch.

**Hard rules:**
- NEVER store private keys (lint should never see one).
- NEVER generate or derive wallets server-side.
- Only public receiving addresses come out of env.
- The strict-network warning is mandatory and rendered next to every
  address.

---

## 7. Local Turkish / bank transfer flow

Reserved abstraction. `ENABLE_LOCAL_MANUAL_PAYMENTS=true` plus
`LOCAL_BANK_INSTRUCTIONS=...` exposes the provider. Today the flow is
identical to crypto manual: generate a pending record + reference, show
free-form instructions, user submits a confirmation note via the same
`/api/payments/crypto/submit` endpoint, admin verifies.

To wire a deep integration (Shopier / iyzico / PayTR) later, drop a new
provider into `lib/payments/providers/`, push it into the registry, and
the routes + UI need no changes.

---

## 8. Admin verification flow

`/admin/payments` is dev-open by default. In production both flags must
be set: `ENABLE_ADMIN_ROUTES=true` and at least one email in
`ADMIN_EMAILS` matching the authenticated Clerk identity. The admin
gate (`lib/admin.ts → requireAdmin`) is the single check both the page
and the verify/reject endpoints consult.

**Verify**:
- re-checks the founder cap (avoid overshoot under concurrent verifies)
- flips PaymentRecord to `verified`
- upserts Customer + Subscription via `BillingStore` (lifetime SKUs
  leave `currentPeriodEnd` undefined)
- appends a `grant` audit event with `meta.paymentId`

**Reject**:
- flips PaymentRecord to `rejected` with an optional 240-char reason
- appends a `revoke` audit event
- does NOT touch any subscription

Both are idempotent against already-terminal records.

---

## 9. Turkey-friendly setup strategy

Recommended default until an international entity exists:

1. **Lemon Squeezy** as the card-payment default. MoR handles VAT, EU
   MOSS, and supports lifetime SKUs natively.
2. **Crypto manual** for the founder lifetime and high-trust customers
   who'd rather not pay card processing.
3. **Local manual / bank transfer** for Turkish customers who prefer
   IBAN — wired through the same `crypto/submit` endpoint with bank
   notes instead of tx hashes.
4. **Stripe disabled** — `STRIPE_SECRET_KEY` unset, provider reports
   disabled cleanly, UpgradeModal renders alternatives only.

Once you migrate to an international entity (Stripe Atlas / US LLC /
UK Ltd):

1. Add `STRIPE_SECRET_KEY` + price ids in env.
2. Stripe lights up automatically in `listProviders()`.
3. Existing customers continue under whatever provider they signed up
   on; new customers see Stripe alongside the alternatives.
4. Sunset Lemon Squeezy / Paddle by setting their env vars empty when
   you're ready.

---

## 10. Accounting / tax disclaimer

Nothing in this codebase constitutes tax or legal advice. Each provider
has different invoicing, VAT, and reporting requirements:

- **Stripe** — you are the merchant of record; you owe sales tax / VAT
  collection where applicable.
- **Paddle / Lemon Squeezy** — MoR; they handle indirect tax. Their
  invoice carries their entity, not yours.
- **Crypto manual** — treat as a foreign-currency transfer. Convert to
  local currency at the time of receipt for bookkeeping. Tax treatment
  varies widely; consult local counsel.
- **Bank transfer** — straightforward; ensure invoice carries your
  registered entity.

Keep payment records (`PaymentStore` + `BillingStore` audit feed) for
the period your jurisdiction requires.

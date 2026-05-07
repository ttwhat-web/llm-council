/**
 * Central registry of event names + payload shapes.
 *
 * Naming: `<domain>.<aggregate>.<verb>` — past tense.
 * Every event carries the same envelope (id, type, occurredAt, actorId, payload)
 * defined in `event-envelope.ts` so consumers can rely on a stable shape.
 */

export const EVENT_TYPES = {
  // ── Splits ──────────────────────────────────────────────────────────────
  SPLIT_CREATED: 'split.created',
  SPLIT_UPDATED: 'split.updated',
  SPLIT_FILLED: 'split.filled',
  SPLIT_CLOSED: 'split.closed',
  SPLIT_CANCELLED: 'split.cancelled',

  ML_REQUESTED: 'ml.requested',
  ML_PURCHASED: 'ml.purchased',
  ML_REFUNDED: 'ml.refunded',
  BOTTLE_REQUESTED: 'bottle.requested',
  BOTTLE_PURCHASED: 'bottle.purchased',

  WAITLIST_JOINED: 'waitlist.joined',
  WAITLIST_PROMOTED: 'waitlist.promoted',

  // ── Marketplace ────────────────────────────────────────────────────────
  LISTING_CREATED: 'listing.created',
  LISTING_UPDATED: 'listing.updated',
  LISTING_PUBLISHED: 'listing.published',
  LISTING_RESERVED: 'listing.reserved',
  LISTING_SOLD: 'listing.sold',
  LISTING_REMOVED: 'listing.removed',

  OFFER_SENT: 'offer.sent',
  OFFER_ACCEPTED: 'offer.accepted',
  OFFER_REJECTED: 'offer.rejected',
  OFFER_COUNTERED: 'offer.countered',
  OFFER_WITHDRAWN: 'offer.withdrawn',

  // ── AI ─────────────────────────────────────────────────────────────────
  AI_CHECK_QUEUED: 'ai.check.queued',
  AI_CHECK_STARTED: 'ai.check.started',
  AI_RISK_UPDATED: 'ai.risk.updated',
  AI_CHECK_COMPLETED: 'ai.check.completed',
  AI_CHECK_FAILED: 'ai.check.failed',

  // ── Payments ───────────────────────────────────────────────────────────
  PAYMENT_INITIATED: 'payment.initiated',
  PAYMENT_AUTHORIZED: 'payment.authorized',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',

  // ── Messaging ──────────────────────────────────────────────────────────
  MESSAGE_SENT: 'message.sent',
  CONVERSATION_OPENED: 'conversation.opened',

  // ── Notifications ──────────────────────────────────────────────────────
  NOTIFICATION_PUSHED: 'notification.pushed',
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

/**
 * Channel naming. Frontends subscribe to channels via the WS gateway.
 *
 *   splits:global       → every public split-domain event
 *   splits:{id}         → one specific split (live ml/progress updates)
 *   market:global       → every listing/offer event
 *   listings:{id}       → one listing + its offers
 *   ai:risk             → all AI risk transitions
 *   ai:risk:{id}        → AI updates for one specific checkable
 *   user:{id}           → private channel: offers received, payments, msgs
 *   payments:{id}       → one payment lifecycle
 */
export const CH = {
  splitsGlobal: () => 'splits:global',
  split: (id: string) => `splits:${id}`,
  marketGlobal: () => 'market:global',
  listing: (id: string) => `listings:${id}`,
  aiRiskGlobal: () => 'ai:risk',
  aiRisk: (id: string) => `ai:risk:${id}`,
  user: (id: string) => `user:${id}`,
  payment: (id: string) => `payments:${id}`,
  conversation: (id: string) => `conversation:${id}`,
};

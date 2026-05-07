# DerinSplit — Real-time Marketplace OS (Backend)

> Event-driven, WebSocket-first backend for a perfume **split + marketplace**
> platform. Behaves like a live trading system: every action propagates to
> every connected client in < 200 ms with **no polling, no refresh**.

```
NestJS  +  Socket.IO  +  Redis pub/sub  +  PostgreSQL (Prisma)
```

---

## 1. Architecture at a glance

```
                    ┌──────────────┐
        HTTP        │   API NODE   │   ──── REST /api/v1/* ────►  Postgres
   ──────────────►  │  (NestJS)    │
                    │              │   ──── publish ──────────►  Redis
                    │  EventBus    │                              (pub/sub)
                    │              │   ◄─── subscribe ────────  Redis
                    └──────┬───────┘
                           │  in-process Subject<EventEnvelope>
                           ▼
                    ┌──────────────┐
                    │  Realtime    │   ──── Socket.IO  ─────►  Clients
                    │  Gateway     │       (rooms = channels)
                    └──────────────┘

   Multiple API nodes connect to the SAME Redis. The Socket.IO Redis
   adapter handles cross-instance broadcast → a client connected to
   node A receives events emitted from node B.
```

### Event flow per write

1. **API** receives a request, validates, and opens a Postgres transaction.
2. **Domain service** writes to Postgres and computes the new state inside
   the same transaction. Concurrent writes serialise on row locks
   (e.g. ml.requested on the same split) so over-allocation is impossible.
3. After commit, the service calls `bus.emit(type, payload, { channels })`.
4. `EventBus.emit()`:
   - persists the envelope to `EventLog` (audit / replay)
   - PUBLISHes the envelope on the single Redis topic `derinsplit:events`
5. Every API instance subscribed to that topic receives the envelope and
   pipes it into its in-process `events$` Observable.
6. `RealtimeGateway` subscribes to `events$` and `server.to(channel).emit('event', envelope)`
   for each channel listed on the envelope. The Socket.IO Redis adapter
   handles cross-instance fan-out.
7. **Frontend** receives one Socket.IO message of shape
   `{ type, occurredAt, channels, payload, … }` and updates its local state.

### Why a single Redis topic + per-event channel list?

- The fan-out logic lives in **one place** (the gateway). Domain code only
  declares which channels an event belongs to — never touches Socket.IO.
- Adding a new channel (say `city:istanbul`) is one line in the domain
  service; no Redis topic plumbing to add.

---

## 2. Folder structure

```
src/
  main.ts                       bootstrap, Redis IO adapter, Swagger
  app.module.ts                 wires every module
  config/configuration.ts       typed env config
  prisma/                       PrismaService + module
  redis/                        ioredis: client / publisher / subscriber
  common/
    decorators/                 @CurrentUser, @Roles
    guards/                     RolesGuard
    events/
      event-types.ts            EVENT_TYPES + CH (channel helpers)
      event-envelope.ts         shape every event uses on the wire
      event-bus.service.ts      persist + publish + in-process Subject
  realtime/
    redis-io.adapter.ts         Socket.IO ↔ Redis adapter
    realtime.gateway.ts         /realtime namespace, subscribe/unsubscribe
    realtime.module.ts
  auth/                         JWT login + OTP login (123456 in dev)
  splits/
    splits.service.ts           join, bottle, waitlist, releaseAndPromote
    splits.controller.ts
    dto/
  marketplace/
    listings.service.ts         listings + offers + accept/reject/counter
    marketplace.controller.ts
    dto/
  ai/
    ai.service.ts               progressive risk scoring (simulated)
    ai.controller.ts
  payments/
    payments.service.ts         stub provider, captures + emits events
    payments.controller.ts
  health/
    health.controller.ts        /health → DB + Redis liveness
prisma/
  schema.prisma                 14 models, full relations
  seed.ts                       2 users, 2 perfumes, 2 splits, 1 listing
docker-compose.yml              postgres + redis + api
Dockerfile                      multi-stage Node 20 image
```

---

## 3. Data model

| Aggregate                | Tables                                                                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **Users / Auth**         | `User` (role: `user` / `trusted_seller` / `admin`, `trustScore`)                                                             |
| **Catalog**              | `Perfume` (brand × name × concentration unique)                                                                              |
| **Splits**               | `Split`, `SplitRequest`, `SplitWaitlistEntry`                                                                                |
| **Marketplace**          | `Listing`, `Offer` (price / trade, with `parentOfferId` for counters)                                                        |
| **Messaging**            | `Conversation`, `Message`                                                                                                    |
| **AI**                   | `AiCheck` (queued → processing → done/failed, holds risk + reasons)                                                          |
| **Payments**             | `Payment` (initiated / authorized / captured / failed / refunded)                                                            |
| **Notifications**        | `Notification` (delivered via WS `user:{id}` channel)                                                                        |
| **Event log**            | `EventLog` — every published envelope, indexed by `(type, createdAt)` and `(aggregateType, aggregateId)` for replay & audit  |
| **WS sessions**          | `WsSession` — connected sockets, useful for ops + debugging                                                                  |

See [`prisma/schema.prisma`](prisma/schema.prisma) for the canonical source.

---

## 4. Event taxonomy

Naming: `<domain>.<aggregate>.<verb>` — past tense.

| Domain     | Events                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------ |
| Splits     | `split.created`, `split.updated`, `split.filled`, `split.closed`, `split.cancelled`                          |
| Purchases  | `ml.requested`, `ml.purchased`, `ml.refunded`, `bottle.requested`, `bottle.purchased`                        |
| Waitlist   | `waitlist.joined`, `waitlist.promoted`                                                                       |
| Listings   | `listing.created`, `listing.updated`, `listing.published`, `listing.reserved`, `listing.sold`, `listing.removed` |
| Offers     | `offer.sent`, `offer.accepted`, `offer.rejected`, `offer.countered`, `offer.withdrawn`                       |
| AI         | `ai.check.queued`, `ai.check.started`, `ai.risk.updated`, `ai.check.completed`, `ai.check.failed`            |
| Payments   | `payment.initiated`, `payment.authorized`, `payment.completed`, `payment.failed`, `payment.refunded`         |
| Messaging  | `conversation.opened`, `message.sent`                                                                        |

### Channel directory

| Channel                | Who can join             | What lands there                               |
| ---------------------- | ------------------------ | ---------------------------------------------- |
| `splits:global`        | anyone                   | every split-domain event (low-volume)          |
| `splits:{id}`          | anyone                   | one specific split's lifecycle                 |
| `market:global`        | anyone                   | every listing/offer event                      |
| `listings:{id}`        | anyone                   | one listing + its offers                       |
| `ai:risk`              | anyone                   | every AI risk transition (ops console)         |
| `ai:risk:{id}`         | anyone                   | AI updates for one checkable                   |
| `user:{id}`            | **only that user**       | private: offers received, payments, DMs        |
| `payments:{id}`        | authed                   | one payment lifecycle                          |
| `conversation:{id}`    | participants             | message/typing for one chat                    |

### Example envelope on the wire

```json
{
  "id": "evt_aR8nMcfG7pQ2bUjV",
  "type": "ml.requested",
  "occurredAt": "2026-05-07T18:42:11.084Z",
  "actorId": "u_buyer_42",
  "aggregateType": "split",
  "aggregateId": "split_xerjoff_naxos",
  "channels": ["splits:global", "splits:split_xerjoff_naxos", "user:u_buyer_42"],
  "payload": {
    "requestId": "req_abc",
    "splitId": "split_xerjoff_naxos",
    "userId": "u_buyer_42",
    "amountMl": 5,
    "totalPrice": "700.00",
    "paymentDeadline": "2026-05-07T19:12:11.084Z"
  }
}
```

---

## 5. WebSocket contract

```ts
// Client connects to:
const socket = io('ws://localhost:4000/realtime', {
  transports: ['websocket'],
  auth: { token: '<JWT>' },         // optional: enables `user:{id}` room
});

// 1) Tell the server which channels you want
socket.emit('subscribe', { channels: ['splits:global', 'market:global', 'ai:risk'] },
  (ack) => console.log('joined', ack.joined));

// 2) Receive every envelope on a single message type
socket.on('event', (envelope) => {
  switch (envelope.type) {
    case 'split.updated': /* patch local state */ break;
    case 'offer.sent':    /* show notification */ break;
    case 'ai.risk.updated': /* update progress UI */ break;
  }
});

// 3) Health-check
socket.emit('ping', null, ({ pong }) => console.log(pong));
```

`canJoin()` in the gateway enforces:

- public channels (splits/listings/market/ai) — open to anyone
- `user:{id}` — only the matching user
- `payments:{id}` / `conversation:{id}` — authed only

---

## 6. REST surface (highlights)

All routes under `/api/v1`. Full OpenAPI at `GET /docs`.

| Verb    | Path                                | Auth          | Purpose                              |
| ------- | ----------------------------------- | ------------- | ------------------------------------ |
| `POST`  | `/auth/request-otp`                 | public        | start phone OTP (dev: any phone OK)  |
| `POST`  | `/auth/verify-otp`                  | public        | verify (dev: code = `123456`)        |
| `GET`   | `/auth/me`                          | JWT           | current user                         |
| `GET`   | `/splits?filter=open`               | public        | list splits                          |
| `GET`   | `/splits/:id`                       | public        | split detail                         |
| `POST`  | `/splits`                           | trusted_sellr | create new split                     |
| `POST`  | `/splits/:id/requests`              | JWT           | join split with N ml                 |
| `POST`  | `/splits/:id/bottle-requests`       | JWT           | reserve full bottle remainder        |
| `POST`  | `/splits/:id/waitlist`              | JWT           | enqueue when full                    |
| `GET`   | `/listings?type=&city=`             | public        | browse marketplace                   |
| `POST`  | `/listings`                         | JWT           | create listing → AI check pending    |
| `POST`  | `/listings/:id/offers`              | JWT           | send price or trade offer            |
| `POST`  | `/offers/:id/accept`                | JWT           | seller accepts                       |
| `POST`  | `/offers/:id/reject`                | JWT           | seller rejects                       |
| `POST`  | `/offers/:id/counter`               | JWT           | seller counters with new price       |
| `POST`  | `/ai/authenticity-check`            | JWT           | start simulated AI check             |
| `GET`   | `/ai/check-status/:id`              | JWT           | poll a finished check (you should subscribe to `ai:risk:{id}` instead) |
| `POST`  | `/payments/initiate`                | JWT           | create stub payment                  |
| `POST`  | `/payments/:id/confirm`             | JWT           | stub provider success/failure        |
| `GET`   | `/health`                           | public        | DB + Redis liveness                  |

---

## 7. Performance & scale

- **Stateless API nodes** — all state in Postgres + Redis, run as many as you need.
- **Cross-instance WebSocket** via `@socket.io/redis-adapter`.
- **Hot path latency**: API write + Redis publish + gateway emit ≈ **5–25 ms**
  on commodity hardware. Frontend update target < 200 ms end-to-end.
- **Backpressure**: `EventBus` uses an in-memory `Subject` per node; no
  buffering is required because consumers are synchronous (just `emit` to
  Socket.IO rooms). Heavy fan-out scales horizontally with more API nodes.
- **At-least-once delivery**: events are persisted to `EventLog` *before*
  publish. A reconnecting client can ask for events since `lastEventId` to
  catch up — replayer is a one-table query (left as a small extension).
- **Race safety**: `joinSplit` / `bottleRequest` / `acceptOffer` run inside
  Postgres transactions and rely on row locks for serialisation. The
  EventBus emit only happens *after* commit (`process.nextTick`) so dropped
  txs never produce phantom events.
- **Optional Kafka path**: swap `RedisService.publisher.publish` →
  `kafkaProducer.send` and add a Kafka consumer alongside the existing
  Redis subscriber. The rest of the stack does not change because the bus
  abstracts the topic.

---

## 8. Run it

### Local (one command)

```bash
cd derinsplit_backend
cp .env.example .env
docker compose up --build
# Postgres on :5432, Redis on :6379, API on :4000
```

Then in another terminal:

```bash
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma db seed
```

### Without Docker

```bash
npm install
cp .env.example .env
# point DATABASE_URL / REDIS_URL at your local services
npx prisma migrate dev
npm run seed
npm run start:dev
```

API: <http://localhost:4000>
OpenAPI: <http://localhost:4000/docs>
WebSocket: `ws://localhost:4000/realtime`

### Smoke test (cURL + wscat)

```bash
# 1) Verify OTP for a brand-new user (dev code is 123456)
curl -s -X POST http://localhost:4000/api/v1/auth/verify-otp \
  -H 'content-type: application/json' \
  -d '{"phone":"+905550001111","code":"123456","name":"Demo"}'

# 2) Watch live events
wscat -c "ws://localhost:4000/realtime?transport=websocket"
> {"type":"subscribe","data":{"channels":["splits:global","ai:risk"]}}

# 3) Trigger an AI check from another shell
curl -s -X POST http://localhost:4000/api/v1/ai/authenticity-check \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"checkableType":"listing","checkableId":"...","images":["a","b","c","d","e"]}'
# → wscat shows ai.check.queued → ai.check.started → ai.risk.updated (×2) → ai.check.completed
```

### Companion dashboard

A minimal Next.js consumer lives at `../derinsplit_dashboard/`. It
subscribes to `splits:global`, `market:global`, `ai:risk` and renders a
live event feed plus a per-split live page at `/splits/[id]`. See its
README for run instructions.

---

## 9. Extending

- **New event type** → add to `EVENT_TYPES` in `event-types.ts`, emit it
  from a service, frontends pick it up automatically.
- **New private channel** → add a helper in `CH` and a rule in
  `RealtimeGateway.canJoin()`.
- **Real AI** → replace `AiService.runCheck` with a queue worker; the
  events it emits stay identical so frontends don't change.
- **Real payments** → replace `PaymentsService.confirmStub` with a
  provider webhook handler that verifies the HMAC against
  `PAYMENTS_WEBHOOK_SECRET`.

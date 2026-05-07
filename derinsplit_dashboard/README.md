# DerinSplit — Live Ops Dashboard

Minimal Next.js 14 (app router) consumer. **Zero business logic.**
It just opens a WebSocket to the backend's `/realtime` namespace, joins a
few channels, and renders incoming events.

## Run

```bash
cp .env.example .env.local
# point at your backend (default http://localhost:4000)
npm install
npm run dev
# open http://localhost:3000
```

## What you'll see

- **`/`** — open splits, active listings, and a live event feed subscribed to
  `splits:global`, `market:global`, `ai:risk`. Trigger any API mutation
  (e.g. join a split via cURL) and watch it appear in real time.
- **`/splits/[id]`** — one split's progress bar + a live feed scoped to
  `splits:{id}` and `ai:risk:{id}`.

## Contract

The frontend only talks to the backend via:
- **REST** (initial fetch): `${NEXT_PUBLIC_API_URL}/api/v1/...`
- **WebSocket** (live updates): `${NEXT_PUBLIC_WS_URL}/realtime`

Every WS message is a single envelope of shape:

```ts
{
  id: string;
  type: string;       // e.g. "ml.requested"
  occurredAt: string; // ISO
  channels: string[];
  payload: unknown;
}
```

See `src/lib/socket.ts` for the (small) client and
`src/components/EventFeed.tsx` for an example consumer.

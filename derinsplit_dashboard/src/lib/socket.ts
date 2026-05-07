import { io, Socket } from 'socket.io-client';

export interface EventEnvelope<P = unknown> {
  id: string;
  type: string;
  occurredAt: string;
  actorId?: string | null;
  aggregateType?: string;
  aggregateId?: string;
  channels: string[];
  payload: P;
}

let socket: Socket | null = null;

export function getSocket(token?: string): Socket {
  if (socket && socket.connected) return socket;
  const url = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';
  socket = io(`${url}/realtime`, {
    transports: ['websocket'],
    auth: token ? { token } : undefined,
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
  });
  return socket;
}

export async function subscribe(channels: string[]) {
  const s = getSocket();
  return new Promise<{ ok: boolean; joined: string[] }>((resolve) =>
    s.emit('subscribe', { channels }, resolve),
  );
}

export async function unsubscribe(channels: string[]) {
  const s = getSocket();
  return new Promise<{ ok: boolean; left: string[] }>((resolve) =>
    s.emit('unsubscribe', { channels }, resolve),
  );
}

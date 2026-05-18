/**
 * Telegram Bridge · Phase 18 adapter seam.
 *
 * No networking yet. The desktop runtime will eventually wire a real
 * Telegram bot token to this seam. Until then, the seam:
 *
 *   · `sendNotification(text)` queues an outbound message locally.
 *   · `receiveInbound(text)` runs the text through the real command
 *     parser and queues the bot's response.
 *
 * The bridge keeps the same call surface as a real adapter, so a later
 * patch can swap the local queue for a fetch to api.telegram.org. The
 * `wired` flag stays `false` until a real `BOT_TOKEN` is configured —
 * we never lie about a "connected" status.
 */

import { useAtlasStore, type BridgeMessage } from "@/store/atlas";
import { executeCommand } from "@/services/commandConsole";

export interface BridgeStatus {
  wired: boolean;
  reason: string;
  link: { code: string; createdAt: number } | null;
  queueDepth: number;
}

export function getBridgeStatus(): BridgeStatus {
  const link = useAtlasStore.getState().telegram;
  const queueDepth = useAtlasStore.getState().bridgeMessages.length;
  return {
    wired: false,
    reason: link
      ? "link code issued · bot networking ships with desktop runtime"
      : "no link code · generate one in this card to mark setup ready",
    link,
    queueDepth
  };
}

/** Push a bot → operator notification into the local queue. */
export function sendNotification(text: string): BridgeMessage {
  return useAtlasStore.getState().appendBridgeMessage({ dir: "out", text });
}

/** Simulate an inbound operator → bot message and execute it. */
export async function receiveInbound(text: string): Promise<BridgeMessage> {
  const inbound = useAtlasStore.getState().appendBridgeMessage({ dir: "in", text });
  // Route through the real command parser so the same handlers a real
  // bot would call back into are exercised here.
  if (text.trim().startsWith("/")) {
    const result = await executeCommand(text);
    useAtlasStore.getState().appendBridgeMessage({
      dir: "out",
      text: result.output
    });
  } else {
    useAtlasStore.getState().appendBridgeMessage({
      dir: "out",
      text: "Bridge accepts /commands only · try /help"
    });
  }
  return inbound;
}

/** Drop the local message log. */
export function clearBridge(): void {
  useAtlasStore.getState().clearBridgeMessages();
}

/** Setup instructions for wiring a real bot. Surfaced in the UI. */
export const BRIDGE_SETUP_NOTES: string[] = [
  "1. Generate a bot via @BotFather → save the token.",
  "2. Store the token in the desktop runtime keychain (never in localStorage).",
  "3. On boot, the runtime opens a long-poll on /getUpdates with the token.",
  "4. Inbound messages whose chat-id matches the issued link code route via receiveInbound().",
  "5. Outbound notifications (sendNotification) flush via /sendMessage.",
  "6. Revoking the link code in this card immediately invalidates inbound auth."
];

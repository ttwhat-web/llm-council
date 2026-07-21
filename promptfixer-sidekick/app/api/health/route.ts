import { NextResponse } from "next/server";
import {
  cloudProvider,
  defaultEngine,
  ollamaProvider,
  routingOrder
} from "@/lib/providers";
import { FREE_DAILY_LIMIT, PRO_DAILY_LIMIT } from "@/lib/usage";
import type { HealthResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [cloud, ollama] = await Promise.all([cloudProvider.health(), ollamaProvider.health()]);

  const payload: HealthResponse = {
    ok: true,
    version: "1.2.0",
    defaultEngine: defaultEngine(),
    cloud,
    ollama,
    deterministicAvailable: true,
    routing: routingOrder(),
    limits: {
      free: FREE_DAILY_LIMIT,
      pro: PRO_DAILY_LIMIT
    }
  };

  return NextResponse.json(payload, { status: 200 });
}

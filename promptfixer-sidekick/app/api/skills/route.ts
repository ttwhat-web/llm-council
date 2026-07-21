/**
 * GET /api/skills
 *
 * Read-only catalogue of every Skill the system knows about (shipped
 * and planned), plus the Tool catalogue. Used by the command palette,
 * the Operations Dashboard, and any future agent / workflow composer.
 *
 * Returns metadata only — no closures, no secrets, no auth state.
 */

import { NextResponse } from "next/server";
import { listSkillCatalogue } from "@/lib/skills";
import { listToolCatalogue } from "@/lib/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      skills: listSkillCatalogue(),
      tools: listToolCatalogue(),
      version: 1
    },
    {
      status: 200,
      headers: {
        // Allow short caching: the catalogue is immutable per deploy.
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300"
      }
    }
  );
}

import { NextResponse } from "next/server";
import { z } from "zod";

import { getBounty } from "@/server/bounties/service";
import { runAutonomousDemoCycle } from "@/server/agents/demo-service";

const requestSchema = z.object({
  bountyId: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  try {
    const parsed = requestSchema.parse(await request.json().catch(() => ({})));
    const result = await runAutonomousDemoCycle(parsed.bountyId);
    const bounty = getBounty(result.bountyId);

    return NextResponse.json({
      ok: true,
      ...result,
      bounty,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to run autonomous demo cycle",
      },
      { status: 400 },
    );
  }
}

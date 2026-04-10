import { NextResponse } from "next/server";
import { z } from "zod";

import { cancelBounty } from "@/server/bounties/service";

const cancelSchema = z.object({
  canceledBy: z.string().min(1),
  reason: z.string().min(3),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const parsed = cancelSchema.parse(await request.json());
    const result = await cancelBounty(id, parsed);

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to cancel bounty",
      },
      { status: 400 },
    );
  }
}

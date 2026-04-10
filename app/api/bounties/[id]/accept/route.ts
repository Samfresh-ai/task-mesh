import { NextResponse } from "next/server";
import { z } from "zod";

import { acceptBounty } from "@/server/bounties/service";

const acceptSchema = z.object({
  workerAgentId: z.string().min(1),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const parsed = acceptSchema.parse(await request.json());
    const result = await acceptBounty(id, parsed);

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to accept bounty",
      },
      { status: 400 },
    );
  }
}

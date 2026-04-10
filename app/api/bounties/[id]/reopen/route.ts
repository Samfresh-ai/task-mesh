import { NextResponse } from "next/server";

import { getBounty, reopenBounty } from "@/server/bounties/service";

type Params = Promise<{ id: string }>;

export async function POST(_request: Request, context: { params: Params }) {
  try {
    const { id } = await context.params;
    const result = reopenBounty(id, "Operator");

    return NextResponse.json({
      ok: true,
      bounty: getBounty(result.bounty.id),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to reopen bounty",
      },
      { status: 400 },
    );
  }
}

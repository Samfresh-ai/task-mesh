import { NextResponse } from "next/server";

import { getBounty, getBountyPersistenceStatus } from "@/server/bounties/service";
import { getBountyBoardConfigStatus } from "@/server/stellar/bounty-board";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bounty = getBounty(id);

  if (!bounty) {
    return NextResponse.json(
      {
        ok: false,
        error: `Unknown bounty ${id}`,
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    bounty,
    persistence: getBountyPersistenceStatus(),
    chainRuntime: getBountyBoardConfigStatus(),
  });
}

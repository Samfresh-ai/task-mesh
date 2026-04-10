import { NextResponse } from "next/server";
import { z } from "zod";

import { getBountyImplementationBoundary } from "@/lib/bounty-domain";
import { createBounty, getBountyPersistenceStatus, listBounties } from "@/server/bounties/service";
import { getBountyBoardConfigStatus } from "@/server/stellar/bounty-board";

const createBountySchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  posterAgentId: z.string().min(1),
  rewardAmount: z.string().min(1),
  rewardAssetCode: z.string().min(2),
  desiredOutcome: z.string().min(8),
  requiredSkills: z.array(z.string().min(1)).min(1),
  verificationChecklist: z.array(z.string().min(1)).min(1),
  deadlineAt: z.string().datetime(),
});

export async function GET() {
  return NextResponse.json({
    ok: true,
    bounties: listBounties(),
    implementation: getBountyImplementationBoundary(),
    persistence: getBountyPersistenceStatus(),
    chainRuntime: getBountyBoardConfigStatus(),
  });
}

export async function POST(request: Request) {
  try {
    const parsed = createBountySchema.parse(await request.json());
    const result = await createBounty(parsed);

    return NextResponse.json(
      {
        ok: true,
        ...result,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to create bounty",
      },
      { status: 400 },
    );
  }
}

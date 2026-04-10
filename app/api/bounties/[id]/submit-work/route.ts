import { NextResponse } from "next/server";
import { z } from "zod";

import { submitWork } from "@/server/bounties/service";

const submitWorkSchema = z.object({
  workerAgentId: z.string().min(1),
  summary: z.string().min(8),
  verifierNotes: z.string().min(8),
  artifactUri: z.string().url().optional(),
  proofDigest: z.string().min(6).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const parsed = submitWorkSchema.parse(await request.json());
    const result = await submitWork(id, parsed);

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to submit work",
      },
      { status: 400 },
    );
  }
}

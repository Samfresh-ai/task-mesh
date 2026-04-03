import { NextResponse } from "next/server";
import { z } from "zod";

import { getMarketDetail } from "@/server/queries";

const paramsSchema = z.object({
  id: z.string().min(1),
});

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = paramsSchema.parse(await context.params);
    const data = await getMarketDetail(params.id);

    if (!data) {
      return NextResponse.json({ error: "Market not found" }, { status: 404 });
    }

    return NextResponse.json({ evidence: data.evidence });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch evidence" },
      { status: 500 },
    );
  }
}

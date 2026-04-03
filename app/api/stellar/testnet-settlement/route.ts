import { NextResponse } from "next/server";

import { createTestnetSettlementProof, getStellarConfig } from "@/lib/stellar";

export async function GET() {
  return NextResponse.json({
    ok: true,
    config: getStellarConfig(),
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { amountXlm?: string; memoText?: string };
    const amountXlm = body.amountXlm?.trim();
    const memoText = body.memoText?.trim();

    if (!amountXlm || !memoText) {
      return NextResponse.json(
        {
          ok: false,
          error: "amountXlm and memoText are required.",
        },
        { status: 400 },
      );
    }

    const result = await createTestnetSettlementProof({ amountXlm, memoText });

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown settlement error",
      },
      { status: 500 },
    );
  }
}

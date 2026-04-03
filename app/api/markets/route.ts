import { NextResponse } from "next/server";

import { getDashboardData } from "@/server/queries";

export async function GET() {
  try {
    const markets = await getDashboardData();
    return NextResponse.json({ markets });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch markets" },
      { status: 500 },
    );
  }
}

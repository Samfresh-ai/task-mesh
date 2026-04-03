import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { isAuthorizedJobRequest } from "@/server/http";
import { pollMarketsJob } from "@/server/markets/service";

async function handler(request: NextRequest) {
  try {
    if (!isAuthorizedJobRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const markets = await pollMarketsJob();
    revalidatePath("/");
    return NextResponse.json({ marketsProcessed: markets.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to poll markets" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return handler(request);
}

export async function GET(request: NextRequest) {
  return handler(request);
}

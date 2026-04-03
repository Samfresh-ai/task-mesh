import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { isAuthorizedJobRequest } from "@/server/http";
import { runDetectorJob } from "@/server/signals/service";

async function handler(request: NextRequest) {
  try {
    if (!isAuthorizedJobRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const signals = await runDetectorJob();
    revalidatePath("/");
    return NextResponse.json({ signalsProcessed: signals.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run detector" },
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

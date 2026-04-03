import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { isAuthorizedJobRequest } from "@/server/http";
import { runFullPipeline } from "@/server/jobs/service";

async function handler(request: NextRequest) {
  try {
    if (!isAuthorizedJobRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await runFullPipeline();
    revalidatePath("/");
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run pipeline" },
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

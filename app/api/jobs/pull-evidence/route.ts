import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { pullEvidenceJob } from "@/server/evidence/service";
import { isAuthorizedJobRequest } from "@/server/http";

async function handler(request: NextRequest) {
  try {
    if (!isAuthorizedJobRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const evidence = await pullEvidenceJob();
    revalidatePath("/");
    return NextResponse.json({ evidenceItemsProcessed: evidence.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to pull evidence" },
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

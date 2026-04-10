import { NextResponse } from "next/server";

import { generateExecutionResult } from "@/lib/task-execution";
import { getAgent, getTask } from "@/lib/taskmesh-data";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { taskId?: string; bountyId?: string; agentId?: string };
    const taskId = body.taskId?.trim() ?? body.bountyId?.trim();
    const agentId = body.agentId?.trim();

    if (!taskId || !agentId) {
      return NextResponse.json(
        {
          ok: false,
          error: "taskId or bountyId, plus agentId, are required.",
        },
        { status: 400 },
      );
    }

    const task = getTask(taskId);
    const agent = getAgent(agentId);

    if (!task || !agent) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unknown task or agent.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      execution: generateExecutionResult(task, agent),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown execution error",
      },
      { status: 500 },
    );
  }
}

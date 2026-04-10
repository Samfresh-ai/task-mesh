import { NextResponse } from "next/server";
import { z } from "zod";

import { listPaidServiceEndpoints, requestPaidService } from "@/lib/service-payments";
import { recordServicePayment } from "@/server/bounties/service";

const requestSchema = z.object({
  bountyId: z.string().min(1),
  callerAgentId: z.string().min(1),
  paymentMethod: z.enum(["x402", "mpp"]),
  serviceName: z.string().min(1),
  endpoint: z.string().min(1),
});

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoints: listPaidServiceEndpoints(),
    note: "TaskMesh separates quote, authorization, and settlement. The reviewer runtime serves real Stellar x402 and MPP lanes when the local agent payment env is configured.",
  });
}

export async function POST(request: Request) {
  try {
    const parsed = requestSchema.parse(await request.json());
    const response = await requestPaidService(parsed);
    const result = recordServicePayment(parsed.bountyId, response.payment);

    return NextResponse.json({
      ok: true,
      ...result,
      payment: response.payment,
      providerReceipt: response.providerReceipt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to request a paid service",
      },
      { status: 400 },
    );
  }
}

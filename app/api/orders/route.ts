import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { requireMember } from "@/lib/farm";
import { apiError, emitFarmUpdate } from "@/lib/http";
import { claimOrder, orderSnapshot } from "@/lib/orders";

const claimSchema = z.object({ orderKey: z.string().min(1) });

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) throw new Error("未登录");
    const member = await requireMember(userId);
    return NextResponse.json({
      farm: {
        coins: member.farm.coins,
        lovePoints: member.farm.lovePoints,
      },
      orders: await orderSnapshot(member.farmId),
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) throw new Error("未登录");
    const member = await requireMember(userId);
    const { orderKey } = claimSchema.parse(await request.json());
    const order = await claimOrder(member.farmId, userId, orderKey);
    emitFarmUpdate(member.farmId);
    return NextResponse.json({
      ok: true,
      orderKey: order.key,
      coinReward: order.coinReward,
      loveReward: order.loveReward,
    });
  } catch (error) {
    return apiError(error);
  }
}

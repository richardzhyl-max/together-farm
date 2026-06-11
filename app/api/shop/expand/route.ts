import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { addPlots, expansionFor, requireMember } from "@/lib/farm";
import { apiError, emitFarmUpdate } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const userId = await getUserId();
    if (!userId) throw new Error("未登录");
    const member = await requireMember(userId);
    const farm = await prisma.farm.findUniqueOrThrow({ where: { id: member.farmId } });
    const expansion = expansionFor(farm.plotCount);
    if (!expansion) throw new Error("暂时无法继续扩建");
    await prisma.$transaction(async (tx) => {
      const paid = await tx.farm.updateMany({
        where: { id: farm.id, plotCount: expansion.from, coins: { gte: expansion.price } },
        data: { coins: { decrement: expansion.price }, plotCount: expansion.to },
      });
      if (!paid.count) throw new Error("金币不够，或农场状态已更新");
      await addPlots(tx, farm.id, expansion.from, expansion.to);
      await tx.farmEventLog.create({ data: { farmId: farm.id, userId, type: "farm_expanded", payload: JSON.stringify(expansion) } });
    });
    emitFarmUpdate(farm.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

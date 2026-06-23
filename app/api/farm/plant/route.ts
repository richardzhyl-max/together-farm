import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { petBonuses, plotState, requireMember } from "@/lib/farm";
import { apiError, emitFarmUpdate } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({ plotId: z.string().min(1), cropKey: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) throw new Error("未登录");
    const member = await requireMember(userId);
    const { plotId, cropKey } = schema.parse(await request.json());
    const [plot, crop, bonuses] = await Promise.all([
      prisma.plot.findFirst({ where: { id: plotId, farmId: member.farmId } }),
      prisma.cropConfig.findFirst({ where: { key: cropKey, enabled: true } }),
      petBonuses(member.farmId),
    ]);
    if (!plot || plotState(plot) !== "empty") throw new Error("这块土地现在不能种植");
    if (!crop) throw new Error("作物不存在");
    const growSeconds = Math.max(1, Math.floor(crop.growDurationSeconds * (1 - bonuses.grow)));
    const now = new Date();
    const matureAt = new Date(now.getTime() + growSeconds * 1000);
    const witherAt = new Date(matureAt.getTime() + crop.witherAfterSeconds * 1000);
    await prisma.$transaction(async (tx) => {
      const paid = await tx.farm.updateMany({
        where: { id: member.farmId, coins: { gte: crop.seedPrice } },
        data: { coins: { decrement: crop.seedPrice } },
      });
      if (!paid.count) throw new Error("金币不够购买这颗种子");
      await tx.plot.update({
        where: { id: plot.id },
        data: { cropKey, plantedAt: now, matureAt, witherAt, growDurationSeconds: growSeconds, waterBoostSeconds: 0, lastWateredAt: null, variantType: null },
      });
      await tx.farmEventLog.create({ data: { farmId: member.farmId, userId, type: "planted", payload: JSON.stringify({ plotId, cropKey }) } });
    });
    emitFarmUpdate(member.farmId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

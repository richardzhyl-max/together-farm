import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { petBonuses, plotState, requireMember } from "@/lib/farm";
import { apiError, emitFarmUpdate } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({ plotId: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) throw new Error("未登录");
    const member = await requireMember(userId);
    const { plotId } = schema.parse(await request.json());
    const plot = await prisma.plot.findFirst({ where: { id: plotId, farmId: member.farmId } });
    if (!plot || !plot.cropKey) throw new Error("这块土地没有作物");
    const state = plotState(plot);
    if (state !== "mature" && state !== "withered") throw new Error("作物还没有成熟");
    const crop = await prisma.cropConfig.findUnique({ where: { key: plot.cropKey } });
    if (!crop) throw new Error("作物配置不存在");
    const bonuses = await petBonuses(member.farmId);
    const earned = state === "withered" ? Math.floor(crop.sellPrice * 0.5) : Math.floor(crop.sellPrice * (1 + bonuses.sell));
    await prisma.$transaction([
      prisma.farm.update({
        where: { id: member.farmId },
        data: { coins: { increment: earned }, lovePoints: { increment: state === "mature" ? 2 : 0 } },
      }),
      prisma.plot.update({
        where: { id: plot.id },
        data: { cropKey: null, plantedAt: null, matureAt: null, witherAt: null, growDurationSeconds: null, waterBoostSeconds: 0, lastWateredAt: null },
      }),
      prisma.farmEventLog.create({ data: { farmId: member.farmId, userId, type: "harvested", payload: JSON.stringify({ plotId, cropKey: crop.key, state, earned }) } }),
    ]);
    emitFarmUpdate(member.farmId);
    return NextResponse.json({ ok: true, earned });
  } catch (error) {
    return apiError(error);
  }
}

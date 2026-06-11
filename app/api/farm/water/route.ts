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
    if (!plot || plotState(plot) !== "growing" || !plot.matureAt || !plot.witherAt || !plot.growDurationSeconds) {
      throw new Error("只有生长中的作物可以浇水");
    }
    const bonuses = await petBonuses(member.farmId);
    const cooldownMs = 30 * 60 * 1000 * (1 - bonuses.cooldown);
    if (plot.lastWateredAt && Date.now() - plot.lastWateredAt.getTime() < cooldownMs) {
      throw new Error(`还要等待 ${Math.ceil((cooldownMs - (Date.now() - plot.lastWateredAt.getTime())) / 60000)} 分钟才能再次浇水`);
    }
    const maxBoost = Math.floor(plot.growDurationSeconds * 0.3);
    const capacity = maxBoost - plot.waterBoostSeconds;
    if (capacity <= 0) throw new Error("这株作物的浇水加速已经达到上限");
    const remaining = Math.max(1, Math.floor((plot.matureAt.getTime() - Date.now()) / 1000));
    const boost = Math.min(capacity, Math.max(1, Math.floor(remaining * 0.05)));
    await prisma.$transaction([
      prisma.plot.update({
        where: { id: plot.id },
        data: {
          matureAt: new Date(plot.matureAt.getTime() - boost * 1000),
          witherAt: new Date(plot.witherAt.getTime() - boost * 1000),
          waterBoostSeconds: { increment: boost },
          lastWateredAt: new Date(),
        },
      }),
      prisma.farm.update({ where: { id: member.farmId }, data: { lovePoints: { increment: 1 } } }),
      prisma.farmEventLog.create({ data: { farmId: member.farmId, userId, type: "watered", payload: JSON.stringify({ plotId, boost }) } }),
    ]);
    emitFarmUpdate(member.farmId);
    return NextResponse.json({ ok: true, boost });
  } catch (error) {
    return apiError(error);
  }
}

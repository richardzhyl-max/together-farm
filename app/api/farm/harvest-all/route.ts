import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { petBonuses, requireMember } from "@/lib/farm";
import { apiError, emitFarmUpdate } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const userId = await getUserId();
    if (!userId) throw new Error("未登录");
    const member = await requireMember(userId);
    const bonuses = await petBonuses(member.farmId);
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const plots = await tx.plot.findMany({
        where: {
          farmId: member.farmId,
          cropKey: { not: null },
          matureAt: { lte: now },
          witherAt: { gt: now },
        },
      });
      const cropKeys = [...new Set(plots.flatMap((plot) => plot.cropKey || []))];
      const crops = await tx.cropConfig.findMany({ where: { key: { in: cropKeys } } });
      const sellPrices = new Map(crops.map((crop) => [crop.key, crop.sellPrice]));
      const harvestable = plots.filter(
        (plot): plot is typeof plot & { cropKey: string } =>
          Boolean(plot.cropKey && sellPrices.has(plot.cropKey)),
      );
      const earned = harvestable.reduce(
        (sum, plot) =>
          sum + Math.floor((sellPrices.get(plot.cropKey) || 0) * (1 + bonuses.sell)),
        0,
      );

      if (harvestable.length === 0) return { harvested: 0, earned: 0 };

      await tx.plot.updateMany({
        where: { id: { in: harvestable.map((plot) => plot.id) } },
        data: {
          cropKey: null,
          plantedAt: null,
          matureAt: null,
          witherAt: null,
          growDurationSeconds: null,
          waterBoostSeconds: 0,
          lastWateredAt: null,
        },
      });
      await tx.farm.update({
        where: { id: member.farmId },
        data: {
          coins: { increment: earned },
          lovePoints: { increment: harvestable.length * 2 },
        },
      });
      await tx.farmEventLog.create({
        data: {
          farmId: member.farmId,
          userId,
          type: "harvested_all",
          payload: JSON.stringify({
            plotIds: harvestable.map((plot) => plot.id),
            harvested: harvestable.length,
            earned,
          }),
        },
      });

      return { harvested: harvestable.length, earned };
    });

    if (result.harvested > 0) emitFarmUpdate(member.farmId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return apiError(error);
  }
}

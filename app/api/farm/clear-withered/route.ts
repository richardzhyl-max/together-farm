import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { requireMember } from "@/lib/farm";
import { apiError, emitFarmUpdate } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const userId = await getUserId();
    if (!userId) throw new Error("未登录");
    const member = await requireMember(userId);
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const witheredPlots = await tx.plot.findMany({
        where: {
          farmId: member.farmId,
          cropKey: { not: null },
          witherAt: { lte: now },
        },
        select: { id: true, cropKey: true },
      });
      const cropKeys = [...new Set(witheredPlots.flatMap((plot) => plot.cropKey || []))];
      const crops = await tx.cropConfig.findMany({ where: { key: { in: cropKeys } } });
      const sellPrices = new Map(crops.map((crop) => [crop.key, crop.sellPrice]));
      const clearable = witheredPlots.filter(
        (plot): plot is typeof plot & { cropKey: string } =>
          Boolean(plot.cropKey && sellPrices.has(plot.cropKey)),
      );
      const earned = clearable.reduce(
        (sum, plot) => sum + Math.floor((sellPrices.get(plot.cropKey) || 0) * 0.5),
        0,
      );
      const cropCounts = clearable.reduce<Record<string, number>>((counts, plot) => {
        counts[plot.cropKey] = (counts[plot.cropKey] || 0) + 1;
        return counts;
      }, {});

      if (clearable.length === 0) return { cleared: 0, earned: 0 };

      await tx.plot.updateMany({
        where: { id: { in: clearable.map((plot) => plot.id) } },
        data: {
          cropKey: null,
          plantedAt: null,
          matureAt: null,
          witherAt: null,
          growDurationSeconds: null,
          waterBoostSeconds: 0,
          lastWateredAt: null,
          variantType: null,
        },
      });
      await tx.farm.update({
        where: { id: member.farmId },
        data: { coins: { increment: earned } },
      });
      await tx.farmEventLog.create({
        data: {
          farmId: member.farmId,
          userId,
          type: "cleared_withered_all",
          payload: JSON.stringify({
            plotIds: clearable.map((plot) => plot.id),
            cleared: clearable.length,
            crops: Object.entries(cropCounts).map(([cropKey, count]) => ({
              cropKey,
              count,
            })),
            earned,
          }),
        },
      });

      return { cleared: clearable.length, earned };
    });

    if (result.cleared > 0) emitFarmUpdate(member.farmId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return apiError(error);
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { petBonuses, plotState, requireMember } from "@/lib/farm";
import { apiError, emitFarmUpdate } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  plotIds: z.array(z.string().min(1)).min(1),
  cropKey: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) throw new Error("未登录");
    const member = await requireMember(userId);
    const input = schema.parse(await request.json());
    const plotIds = [...new Set(input.plotIds)];
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const [farm, crop, bonuses, plots] = await Promise.all([
        tx.farm.findUnique({ where: { id: member.farmId }, select: { coins: true } }),
        tx.cropConfig.findFirst({ where: { key: input.cropKey, enabled: true } }),
        petBonuses(member.farmId, tx),
        tx.plot.findMany({ where: { id: { in: plotIds }, farmId: member.farmId } }),
      ]);

      if (!farm) throw new Error("农场不存在");
      if (!crop) throw new Error("作物不存在");

      const emptyPlots = plots
        .filter((plot) => plotState(plot, now) === "empty")
        .sort((a, b) => plotIds.indexOf(a.id) - plotIds.indexOf(b.id));
      const affordableCount = Math.floor(farm.coins / crop.seedPrice);
      const plantable = emptyPlots.slice(0, affordableCount);

      if (plantable.length === 0) {
        if (emptyPlots.length > 0) throw new Error("金币不够购买这些种子");
        return { planted: 0, spent: 0 };
      }

      const growSeconds = Math.max(
        1,
        Math.floor(crop.growDurationSeconds * (1 - bonuses.grow)),
      );
      const matureAt = new Date(now.getTime() + growSeconds * 1000);
      const witherAt = new Date(matureAt.getTime() + crop.witherAfterSeconds * 1000);
      const spent = plantable.length * crop.seedPrice;

      await tx.farm.update({
        where: { id: member.farmId },
        data: { coins: { decrement: spent } },
      });
      await tx.plot.updateMany({
        where: { id: { in: plantable.map((plot) => plot.id) } },
        data: {
          cropKey: crop.key,
          plantedAt: now,
          matureAt,
          witherAt,
          growDurationSeconds: growSeconds,
          waterBoostSeconds: 0,
          lastWateredAt: null,
          variantType: null,
        },
      });
      await tx.farmEventLog.create({
        data: {
          farmId: member.farmId,
          userId,
          type: "planted_many",
          payload: JSON.stringify({
            plotIds: plantable.map((plot) => plot.id),
            cropKey: crop.key,
            planted: plantable.length,
            spent,
          }),
        },
      });

      return { planted: plantable.length, spent };
    });

    if (result.planted > 0) emitFarmUpdate(member.farmId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return apiError(error);
  }
}

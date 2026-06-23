import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { dailyWishFor, dateKey, petBonuses, requireMember } from "@/lib/farm";
import { apiError, emitFarmUpdate } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const userId = await getUserId();
    if (!userId) throw new Error("未登录");
    const member = await requireMember(userId);
    const today = dateKey();

    const result = await prisma.$transaction(async (tx) => {
      const farm = await tx.farm.findUniqueOrThrow({ where: { id: member.farmId } });
      const crops = await tx.cropConfig.findMany({ where: { enabled: true }, orderBy: { seedPrice: "asc" } });
      const completed = await tx.farmEventLog.findFirst({
        where: {
          farmId: member.farmId,
          type: "daily_wish_completed",
          payload: { contains: `"dateKey":"${today}"` },
        },
      });
      const bonuses = await petBonuses(member.farmId, tx);
      if (completed) throw new Error("今天的心愿订单已经完成啦");
      const wish = dailyWishFor(member.farmId, crops, farm.plotCount, today);
      if (!wish) throw new Error("今天还没有心愿订单");

      const now = new Date();
      const plots = await tx.plot.findMany({
        where: {
          farmId: member.farmId,
          cropKey: wish.cropKey,
          matureAt: { lte: now },
          witherAt: { gt: now },
        },
        orderBy: { index: "asc" },
        take: wish.required,
      });
      if (plots.length < wish.required) {
        throw new Error(`还需要 ${wish.required - plots.length} 个成熟的${wish.cropName}`);
      }

      const coinReward = Math.floor(wish.coinReward * (1 + bonuses.sell));
      await tx.plot.updateMany({
        where: { id: { in: plots.map((plot) => plot.id) } },
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
        data: {
          coins: { increment: coinReward },
          lovePoints: { increment: wish.loveReward },
        },
      });
      await tx.farmEventLog.create({
        data: {
          farmId: member.farmId,
          userId,
          type: "daily_wish_completed",
          payload: JSON.stringify({
            dateKey: today,
            cropKey: wish.cropKey,
            required: wish.required,
            coinReward,
            loveReward: wish.loveReward,
            plotIds: plots.map((plot) => plot.id),
          }),
        },
      });

      return { ...wish, coinReward };
    });

    emitFarmUpdate(member.farmId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return apiError(error);
  }
}

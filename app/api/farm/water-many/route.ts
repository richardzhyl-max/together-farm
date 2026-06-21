import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { petBonuses, plotState, requireMember } from "@/lib/farm";
import { apiError, emitFarmUpdate } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  plotIds: z.array(z.string().min(1)).min(1),
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
      const [bonuses, plots] = await Promise.all([
        petBonuses(member.farmId, tx),
        tx.plot.findMany({ where: { id: { in: plotIds }, farmId: member.farmId } }),
      ]);
      const cooldownMs = 30 * 60 * 1000 * (1 - bonuses.cooldown);
      const waterable = plots
        .filter(
          (plot) =>
            plotState(plot, now) === "growing" &&
            plot.matureAt &&
            plot.witherAt &&
            plot.growDurationSeconds &&
            (!plot.lastWateredAt || now.getTime() - plot.lastWateredAt.getTime() >= cooldownMs) &&
            Math.floor(plot.growDurationSeconds * 0.3) - plot.waterBoostSeconds > 0,
        )
        .sort((a, b) => plotIds.indexOf(a.id) - plotIds.indexOf(b.id));

      if (waterable.length === 0) return { watered: 0, totalBoost: 0 };

      const updates = waterable.map((plot) => {
        const maxBoost = Math.floor((plot.growDurationSeconds || 0) * 0.3);
        const capacity = maxBoost - plot.waterBoostSeconds;
        const remaining = Math.max(1, Math.floor(((plot.matureAt?.getTime() || now.getTime()) - now.getTime()) / 1000));
        const boost = Math.min(capacity, Math.max(1, Math.floor(remaining * 0.05)));
        return { plot, boost };
      });
      const totalBoost = updates.reduce((sum, item) => sum + item.boost, 0);

      await Promise.all(
        updates.map(({ plot, boost }) =>
          tx.plot.update({
            where: { id: plot.id },
            data: {
              matureAt: new Date((plot.matureAt?.getTime() || now.getTime()) - boost * 1000),
              witherAt: new Date((plot.witherAt?.getTime() || now.getTime()) - boost * 1000),
              waterBoostSeconds: { increment: boost },
              lastWateredAt: now,
            },
          }),
        ),
      );
      await tx.farm.update({
        where: { id: member.farmId },
        data: { lovePoints: { increment: waterable.length } },
      });
      await tx.farmEventLog.create({
        data: {
          farmId: member.farmId,
          userId,
          type: "watered_many",
          payload: JSON.stringify({
            plotIds: waterable.map((plot) => plot.id),
            watered: waterable.length,
            totalBoost,
          }),
        },
      });

      return { watered: waterable.length, totalBoost };
    });

    if (result.watered > 0) emitFarmUpdate(member.farmId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return apiError(error);
  }
}

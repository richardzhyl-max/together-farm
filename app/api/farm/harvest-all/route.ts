import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import {
  CROP_VARIANT_CONFIG,
  lockMaturePlotVariants,
  recordCropCollection,
  variantReward,
  type CropVariantType,
} from "@/lib/crop-variants";
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
      await lockMaturePlotVariants(tx, member.farmId, now);
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
      const cropMap = new Map(crops.map((crop) => [crop.key, crop]));
      const harvestable = plots.filter(
        (plot): plot is typeof plot & { cropKey: string } =>
          Boolean(plot.cropKey && cropMap.has(plot.cropKey)),
      );
      const harvests: {
        plotId: string;
        cropKey: string;
        variantType: CropVariantType;
        earned: number;
        loveReward: number;
        firstVariantDiscovery: boolean;
      }[] = [];
      const cropCounts = harvestable.reduce<Record<string, number>>((counts, plot) => {
        counts[plot.cropKey] = (counts[plot.cropKey] || 0) + 1;
        return counts;
      }, {});

      if (harvestable.length === 0) return { harvested: 0, earned: 0 };

      for (const plot of harvestable) {
        const crop = cropMap.get(plot.cropKey);
        if (!crop) continue;
        const variantType = (plot.variantType || "normal") as CropVariantType;
        const earned = variantReward(crop.sellPrice, bonuses.sell, variantType);
        const loveReward = CROP_VARIANT_CONFIG[variantType].loveReward;
        const collection = await recordCropCollection(tx, {
          farmId: member.farmId,
          userId,
          cropKey: crop.key,
          variantType,
          reward: earned,
          timestamp: now,
        });
        harvests.push({
          plotId: plot.id,
          cropKey: crop.key,
          variantType,
          earned,
          loveReward,
          firstVariantDiscovery: collection.firstVariantDiscovery,
        });
      }

      const earned = harvests.reduce((sum, harvest) => sum + harvest.earned, 0);
      const loveReward = harvests.reduce((sum, harvest) => sum + harvest.loveReward, 0);

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
          variantType: null,
        },
      });
      await tx.farm.update({
        where: { id: member.farmId },
        data: {
          coins: { increment: earned },
          lovePoints: { increment: loveReward },
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
            crops: Object.entries(cropCounts).map(([cropKey, count]) => ({
              cropKey,
              count,
            })),
            earned,
            loveReward,
            variants: harvests.map((harvest) => ({
              plotId: harvest.plotId,
              cropKey: harvest.cropKey,
              variantType: harvest.variantType,
              earned: harvest.earned,
              firstVariantDiscovery: harvest.firstVariantDiscovery,
            })),
          }),
        },
      });

      return {
        harvested: harvestable.length,
        earned,
        loveReward,
        variants: harvests.map((harvest) => ({
          cropKey: harvest.cropKey,
          variantType: harvest.variantType,
          earned: harvest.earned,
          firstVariantDiscovery: harvest.firstVariantDiscovery,
        })),
        firstVariantDiscoveries: harvests.filter((harvest) => harvest.firstVariantDiscovery).length,
      };
    });

    if (result.harvested > 0) emitFarmUpdate(member.farmId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return apiError(error);
  }
}

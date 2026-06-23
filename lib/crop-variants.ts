import type { Prisma } from "@prisma/client";
import { loveBondFor } from "@/lib/love-bond";

export const CROP_KEYS = [
  "radish",
  "bokchoy",
  "wheat",
  "corn",
  "tomato",
  "pumpkin",
  "strawberry",
  "blueberry",
  "grape",
  "cotton",
  "starflower",
  "moonshroom",
  "heartrose",
] as const;

export type CropVariantType = "normal" | "golden" | "rainbow";

function variantDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export const CROP_VARIANT_CONFIG = {
  normal: {
    label: "普通",
    saleMultiplier: 1,
    loveReward: 2,
  },
  golden: {
    label: "金色",
    baseProbability: 0.8,
    maxProbability: 0.8,
    saleMultiplier: 3,
    loveReward: 5,
  },
  rainbow: {
    label: "炫彩",
    baseProbability: 0.35,
    maxProbability: 0.35,
    saleMultiplier: 10,
    loveReward: 20,
  },
} as const;

export const CROP_VARIANT_ASSETS = Object.fromEntries(
  CROP_KEYS.map((cropKey) => [
    cropKey,
    {
      golden: `/assets/game/crops/variants/${cropKey}/golden.png?v=ai-2`,
      rainbow: `/assets/game/crops/variants/${cropKey}/rainbow.png?v=ai-2`,
    },
  ]),
) as Record<(typeof CROP_KEYS)[number], Record<Exclude<CropVariantType, "normal">, string>>;

type VariantContext = {
  farmId: string;
  lovePoints: number;
  activePetKey: string | null;
  maxWaterBoostReached: boolean;
};

export type VariantOdds = {
  golden: number;
  rainbow: number;
  bonuses: {
    pairLogin: boolean;
    loveBondLevel: number;
    activePet: boolean;
    maxWaterBoostReached: boolean;
  };
};

export function variantOdds(context: VariantContext & { pairLogin: boolean }): VariantOdds {
  const loveBond = loveBondFor(context.lovePoints);
  const levelBonus =
    loveBond.level >= 4 ? 0.005 : loveBond.level >= 3 ? 0.003 : loveBond.level >= 2 ? 0.002 : 0;
  const bonus =
    (context.pairLogin ? 0.002 : 0) +
    levelBonus +
    (context.activePetKey ? 0.002 : 0) +
    (context.maxWaterBoostReached ? 0.003 : 0);

  return {
    golden: Math.min(
      CROP_VARIANT_CONFIG.golden.maxProbability,
      CROP_VARIANT_CONFIG.golden.baseProbability + bonus,
    ),
    rainbow: Math.min(
      CROP_VARIANT_CONFIG.rainbow.maxProbability,
      CROP_VARIANT_CONFIG.rainbow.baseProbability + bonus,
    ),
    bonuses: {
      pairLogin: context.pairLogin,
      loveBondLevel: loveBond.level,
      activePet: Boolean(context.activePetKey),
      maxWaterBoostReached: context.maxWaterBoostReached,
    },
  };
}

export async function cropVariantContext(
  tx: Prisma.TransactionClient,
  farmId: string,
  plot: { growDurationSeconds: number | null; waterBoostSeconds: number },
) {
  const [farm, pairLoginCount] = await Promise.all([
    tx.farm.findUniqueOrThrow({
      where: { id: farmId },
      select: { lovePoints: true, activePetKey: true },
    }),
    tx.loginDay.count({ where: { farmId, dateKey: variantDateKey() } }),
  ]);
  const maxBoost = Math.floor((plot.growDurationSeconds || 0) * 0.3);

  return {
    farmId,
    lovePoints: farm.lovePoints,
    activePetKey: farm.activePetKey,
    pairLogin: pairLoginCount >= 2,
    maxWaterBoostReached: maxBoost > 0 && plot.waterBoostSeconds >= maxBoost,
  };
}

export function rollCropVariant(odds: VariantOdds): CropVariantType {
  if (Math.random() < odds.rainbow) return "rainbow";
  if (Math.random() < odds.golden) return "golden";
  return "normal";
}

export async function lockMaturePlotVariants(
  client: Prisma.TransactionClient,
  farmId: string,
  now = new Date(),
) {
  const plots = await client.plot.findMany({
    where: {
      farmId,
      cropKey: { not: null },
      matureAt: { lte: now },
      witherAt: { gt: now },
      variantType: null,
    },
    select: {
      id: true,
      growDurationSeconds: true,
      waterBoostSeconds: true,
    },
  });
  if (!plots.length) return 0;

  const [farm, pairLoginCount] = await Promise.all([
    client.farm.findUniqueOrThrow({
      where: { id: farmId },
      select: { lovePoints: true, activePetKey: true },
    }),
    client.loginDay.count({ where: { farmId, dateKey: variantDateKey(now) } }),
  ]);

  await Promise.all(
    plots.map((plot) => {
      const maxBoost = Math.floor((plot.growDurationSeconds || 0) * 0.3);
      const variantType = rollCropVariant(
        variantOdds({
          farmId,
          lovePoints: farm.lovePoints,
          activePetKey: farm.activePetKey,
          pairLogin: pairLoginCount >= 2,
          maxWaterBoostReached: maxBoost > 0 && plot.waterBoostSeconds >= maxBoost,
        }),
      );
      return client.plot.update({
        where: { id: plot.id },
        data: { variantType },
      });
    }),
  );

  return plots.length;
}

export async function recordCropCollection(
  tx: Prisma.TransactionClient,
  input: {
    farmId: string;
    userId: string;
    cropKey: string;
    variantType: CropVariantType;
    reward: number;
    timestamp: Date;
  },
) {
  const existing = await tx.cropCollectionEntry.findUnique({
    where: {
      farmId_cropKey_variantType: {
        farmId: input.farmId,
        cropKey: input.cropKey,
        variantType: input.variantType,
      },
    },
  });

  await tx.cropCollectionEntry.upsert({
    where: {
      farmId_cropKey_variantType: {
        farmId: input.farmId,
        cropKey: input.cropKey,
        variantType: input.variantType,
      },
    },
    create: {
      farmId: input.farmId,
      cropKey: input.cropKey,
      variantType: input.variantType,
      discoveredAt: input.timestamp,
      discoveryCount: 1,
      highestSellPrice: input.reward,
    },
    update: {
      discoveryCount: { increment: 1 },
      highestSellPrice: Math.max(existing?.highestSellPrice || 0, input.reward),
    },
  });

  const firstVariantDiscovery = input.variantType !== "normal" && !existing;
  if (firstVariantDiscovery) {
    await tx.farmEventLog.create({
      data: {
        farmId: input.farmId,
        userId: input.userId,
        type: "crop_variant_discovered",
        payload: JSON.stringify({
          cropKey: input.cropKey,
          variantType: input.variantType,
          reward: input.reward,
          timestamp: input.timestamp.toISOString(),
        }),
      },
    });
  }

  return { firstVariantDiscovery };
}

export function variantReward(baseSellPrice: number, sellBonus: number, variantType: CropVariantType) {
  return Math.floor(baseSellPrice * (1 + sellBonus) * CROP_VARIANT_CONFIG[variantType].saleMultiplier);
}

import type { Prisma, PrismaClient } from "@prisma/client";
import { dateKey } from "@/lib/farm";
import { prisma } from "@/lib/prisma";

export type OrderPeriod = "daily" | "weekly";

export type FarmOrder = {
  key: string;
  period: OrderPeriod;
  periodKey: string;
  title: string;
  description: string;
  cropKey: string | null;
  cropName: string | null;
  target: number;
  progress: number;
  coinReward: number;
  loveReward: number;
  completed: boolean;
  claimed: boolean;
};

type CropForOrder = {
  key: string;
  name: string;
  rarity: string;
  sellPrice: number;
};

type OrderTemplate = {
  key: string;
  period: OrderPeriod;
  title: string;
  cropKey: string | null;
  cropName: string | null;
  target: number;
  coinReward: number;
  loveReward: number;
};

function stableHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickCrop(crops: CropForOrder[], seed: string, allowEpic = true) {
  const pool = allowEpic ? crops : crops.filter((crop) => crop.rarity !== "史诗");
  const fallback = pool.length ? pool : crops;
  if (!fallback.length) return null;
  return fallback[stableHash(seed) % fallback.length];
}

function shanghaiDateFromKey(key: string) {
  return new Date(`${key}T00:00:00+08:00`);
}

function addDays(key: string, days: number) {
  const date = shanghaiDateFromKey(key);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKey(date);
}

export function weekKey(date = new Date()) {
  const today = dateKey(date);
  const localNoon = new Date(`${today}T12:00:00+08:00`);
  const day = localNoon.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  localNoon.setUTCDate(localNoon.getUTCDate() - daysSinceMonday);
  return dateKey(localNoon);
}

export function orderPeriodBounds(period: OrderPeriod, now = new Date()) {
  const periodKey = period === "daily" ? dateKey(now) : weekKey(now);
  const start = shanghaiDateFromKey(periodKey);
  const end = shanghaiDateFromKey(addDays(periodKey, period === "daily" ? 1 : 7));
  return { periodKey, start, end };
}

function orderTemplates(
  farmId: string,
  crops: CropForOrder[],
  period: OrderPeriod,
  periodKey: string,
): OrderTemplate[] {
  const first = pickCrop(crops, `${farmId}:${periodKey}:${period}:first`, false);
  const second = pickCrop(crops, `${farmId}:${periodKey}:${period}:second`);
  const third = pickCrop(
    crops.filter((crop) => crop.rarity === "稀有" || crop.rarity === "史诗"),
    `${farmId}:${periodKey}:${period}:third`,
  ) || second || first;

  if (period === "daily") {
    return [
      {
        key: "daily-total",
        period,
        title: "今日采收",
        cropKey: null,
        cropName: null,
        target: 4,
        coinReward: 180,
        loveReward: 2,
      },
      cropOrder("daily-first", period, "小篮指定单", first, 2, 1.25, 3),
      cropOrder("daily-second", period, "新鲜补货单", second, 1, 1.45, 4),
    ].filter(Boolean) as OrderTemplate[];
  }

  return [
    {
      key: "weekly-total",
      period,
      title: "本周丰收",
      cropKey: null,
      cropName: null,
      target: 20,
      coinReward: 1200,
      loveReward: 10,
    },
    cropOrder("weekly-first", period, "本周主推", second, 6, 1.55, 12),
    cropOrder("weekly-rare", period, "精品作物箱", third, 3, 1.8, 16),
  ].filter(Boolean) as OrderTemplate[];
}

function cropOrder(
  key: string,
  period: OrderPeriod,
  title: string,
  crop: CropForOrder | null,
  target: number,
  rewardMultiplier: number,
  loveReward: number,
): OrderTemplate | null {
  if (!crop) return null;
  return {
    key,
    period,
    title,
    cropKey: crop.key,
    cropName: crop.name,
    target,
    coinReward: Math.floor(crop.sellPrice * target * rewardMultiplier),
    loveReward,
  };
}

function parsePayload(payload: string) {
  try {
    return JSON.parse(payload) as {
      cropKey?: string;
      harvested?: number;
      crops?: { cropKey?: string; count?: number }[];
    };
  } catch {
    return {};
  }
}

async function harvestProgress(
  farmId: string,
  period: OrderPeriod,
  now: Date,
  client: Prisma.TransactionClient | PrismaClient = prisma,
) {
  const { start, end } = orderPeriodBounds(period, now);
  const logs = await client.farmEventLog.findMany({
    where: {
      farmId,
      type: { in: ["harvested", "harvested_all"] },
      createdAt: { gte: start, lt: end },
    },
    select: { type: true, payload: true },
  });
  const byCrop: Record<string, number> = {};
  let total = 0;

  for (const log of logs) {
    const payload = parsePayload(log.payload);
    if (log.type === "harvested" && payload.cropKey) {
      total += 1;
      byCrop[payload.cropKey] = (byCrop[payload.cropKey] || 0) + 1;
      continue;
    }
    if (log.type === "harvested_all") {
      total += Math.max(0, Number(payload.harvested) || 0);
      for (const crop of payload.crops || []) {
        if (!crop.cropKey) continue;
        byCrop[crop.cropKey] = (byCrop[crop.cropKey] || 0) + Math.max(0, Number(crop.count) || 0);
      }
    }
  }

  return { total, byCrop };
}

export async function orderSnapshot(
  farmId: string,
  now = new Date(),
  client: Prisma.TransactionClient | PrismaClient = prisma,
) {
  const crops = await client.cropConfig.findMany({
    where: { enabled: true },
    orderBy: { seedPrice: "asc" },
    select: { key: true, name: true, rarity: true, sellPrice: true },
  });
  const periods: OrderPeriod[] = ["daily", "weekly"];
  const [claims, dailyProgress, weeklyProgress] = await Promise.all([
    client.orderClaim.findMany({
      where: {
        farmId,
        OR: periods.map((period) => {
          const { periodKey } = orderPeriodBounds(period, now);
          return { period, periodKey };
        }),
      },
    }),
    harvestProgress(farmId, "daily", now, client),
    harvestProgress(farmId, "weekly", now, client),
  ]);
  const claimKeys = new Set(claims.map((claim) => `${claim.orderKey}:${claim.periodKey}`));

  return periods.flatMap((period) => {
    const { periodKey } = orderPeriodBounds(period, now);
    const progress = period === "daily" ? dailyProgress : weeklyProgress;
    return orderTemplates(farmId, crops, period, periodKey).map((order) => {
      const count = order.cropKey ? progress.byCrop[order.cropKey] || 0 : progress.total;
      return {
        ...order,
        periodKey,
        description: order.cropName
          ? `收获 ${order.target} 个${order.cropName}`
          : `收获任意作物 ${order.target} 个`,
        progress: Math.min(count, order.target),
        completed: count >= order.target,
        claimed: claimKeys.has(`${order.key}:${periodKey}`),
      };
    });
  });
}

export async function claimOrder(farmId: string, userId: string, orderKey: string) {
  return prisma.$transaction(async (tx) => {
    const orders = await orderSnapshot(farmId, new Date(), tx);
    const order = orders.find((item) => item.key === orderKey);
    if (!order) throw new Error("订单不存在");
    if (!order.completed) throw new Error("订单还没有完成");
    if (order.claimed) throw new Error("这个订单已经领取过奖励");

    await tx.orderClaim.create({
      data: {
        farmId,
        userId,
        orderKey: order.key,
        period: order.period,
        periodKey: order.periodKey,
        coinReward: order.coinReward,
        loveReward: order.loveReward,
      },
    });
    await tx.farm.update({
      where: { id: farmId },
      data: {
        coins: { increment: order.coinReward },
        lovePoints: { increment: order.loveReward },
      },
    });
    await tx.farmEventLog.create({
      data: {
        farmId,
        userId,
        type: "order_claimed",
        payload: JSON.stringify({
          orderKey: order.key,
          period: order.period,
          periodKey: order.periodKey,
          coinReward: order.coinReward,
          loveReward: order.loveReward,
        }),
      },
    });

    return order;
  });
}

import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PlotState = "empty" | "growing" | "mature" | "withered";

export const expansionSteps = [
  { from: 4, to: 6, price: 500 },
  { from: 6, to: 9, price: 1500 },
  { from: 9, to: 12, price: 4000 },
  { from: 12, to: 16, price: 9000 },
  { from: 16, to: 20, price: 18000 },
];

export function expansionFor(count: number) {
  const fixed = expansionSteps.find((step) => step.from === count);
  if (fixed) return fixed;
  if (count >= 20) {
    const tier = Math.floor((count - 20) / 4);
    return { from: count, to: count + 4, price: 30000 + tier * 15000 };
  }
  return null;
}

export function plotState(plot: {
  cropKey: string | null;
  matureAt: Date | null;
  witherAt: Date | null;
}, now = new Date()): PlotState {
  if (!plot.cropKey || !plot.matureAt || !plot.witherAt) return "empty";
  if (now >= plot.witherAt) return "withered";
  if (now >= plot.matureAt) return "mature";
  return "growing";
}

export async function requireMember(userId: string) {
  const member = await prisma.farmMember.findUnique({
    where: { userId },
    include: { farm: true, user: { select: { username: true } } },
  });
  if (!member) throw new Error("你还没有加入农场");
  return member;
}

export async function petBonuses(farmId: string) {
  const pets = await prisma.farmPet.findMany({
    where: { farmId },
    include: { pet: true },
  });
  return {
    sell: Math.min(0.2, pets.reduce((sum, row) => sum + row.pet.sellBonus, 0)),
    grow: Math.min(0.2, pets.reduce((sum, row) => sum + row.pet.growBonus, 0)),
    cooldown: Math.min(0.3, pets.reduce((sum, row) => sum + row.pet.waterCooldown, 0)),
    autoWater: pets.reduce((sum, row) => sum + row.pet.autoWaterPlots, 0),
  };
}

function dateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function recordDailyLogin(userId: string, farmId: string) {
  const today = dateKey();
  await prisma.loginDay.upsert({
    where: { userId_dateKey: { userId, dateKey: today } },
    create: { userId, farmId, dateKey: today },
    update: {},
  });
  const logins = await prisma.loginDay.findMany({ where: { farmId, dateKey: today } });
  if (new Set(logins.map((row) => row.userId)).size >= 2 && !logins.some((row) => row.rewarded)) {
    await prisma.$transaction([
      prisma.farm.update({ where: { id: farmId }, data: { lovePoints: { increment: 3 } } }),
      prisma.loginDay.updateMany({ where: { farmId, dateKey: today }, data: { rewarded: true } }),
      prisma.farmEventLog.create({ data: { farmId, type: "daily_login_pair", payload: '{"lovePoints":3}' } }),
    ]);
  }
}

export async function runFairyAutoWater(farmId: string) {
  const farm = await prisma.farm.findUnique({ where: { id: farmId } });
  if (!farm || farm.autoWateredDate === dateKey()) return;
  const bonuses = await petBonuses(farmId);
  if (!bonuses.autoWater) return;
  const plots = await prisma.plot.findMany({ where: { farmId, cropKey: { not: null } } });
  const growing = plots.filter((plot) => plotState(plot) === "growing");
  if (!growing.length) return;
  const selected = growing.sort(() => Math.random() - 0.5).slice(0, bonuses.autoWater);
  await prisma.$transaction([
    ...selected.map((plot) => {
      const maxBoost = Math.floor((plot.growDurationSeconds || 0) * 0.3);
      const remainingCapacity = Math.max(0, maxBoost - plot.waterBoostSeconds);
      const remainingSeconds = Math.max(0, ((plot.matureAt?.getTime() || 0) - Date.now()) / 1000);
      const boost = Math.min(remainingCapacity, Math.max(1, Math.floor(remainingSeconds * 0.05)));
      return prisma.plot.update({
        where: { id: plot.id },
        data: {
          matureAt: new Date((plot.matureAt?.getTime() || Date.now()) - boost * 1000),
          witherAt: new Date((plot.witherAt?.getTime() || Date.now()) - boost * 1000),
          waterBoostSeconds: { increment: boost },
          lastWateredAt: new Date(),
        },
      });
    }),
    prisma.farm.update({ where: { id: farmId }, data: { autoWateredDate: dateKey() } }),
  ]);
}

export async function farmSnapshot(userId: string) {
  const member = await requireMember(userId);
  await recordDailyLogin(userId, member.farmId);
  await runFairyAutoWater(member.farmId);
  const farm = await prisma.farm.findUniqueOrThrow({
    where: { id: member.farmId },
    include: {
      members: { include: { user: { select: { id: true, username: true } } }, orderBy: { joinedAt: "asc" } },
      plots: { orderBy: { index: "asc" } },
      pets: { include: { pet: true }, orderBy: { purchasedAt: "asc" } },
      decorations: { include: { decoration: true }, orderBy: { purchasedAt: "asc" } },
    },
  });
  const cropRows = await prisma.cropConfig.findMany({ where: { enabled: true } });
  const crops = Object.fromEntries(cropRows.map((crop) => [crop.key, crop]));
  const bonuses = await petBonuses(farm.id);
  const now = new Date();
  return {
    id: farm.id,
    name: farm.name,
    inviteCode: farm.inviteCode,
    coins: farm.coins,
    lovePoints: farm.lovePoints,
    plotCount: farm.plotCount,
    members: farm.members.map((row) => row.user),
    plots: farm.plots.map((plot) => ({
      ...plot,
      state: plotState(plot, now),
      crop: plot.cropKey ? crops[plot.cropKey] : null,
    })),
    pets: farm.pets.map((row) => row.pet),
    decorations: farm.decorations.map((row) => ({ ...row.decoration, quantity: row.quantity })),
    bonuses,
    expansion: expansionFor(farm.plotCount),
    serverNow: now.toISOString(),
  };
}

export async function addPlots(
  tx: Prisma.TransactionClient | PrismaClient,
  farmId: string,
  from: number,
  to: number,
) {
  for (let index = from; index < to; index += 1) {
    await tx.plot.create({ data: { farmId, index } });
  }
}

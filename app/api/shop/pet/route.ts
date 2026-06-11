import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { requireMember } from "@/lib/farm";
import { apiError, emitFarmUpdate } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({ key: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) throw new Error("未登录");
    const member = await requireMember(userId);
    const { key } = schema.parse(await request.json());
    const [pet, farm, owned] = await Promise.all([
      prisma.petConfig.findFirst({ where: { key, enabled: true } }),
      prisma.farm.findUniqueOrThrow({ where: { id: member.farmId } }),
      prisma.farmPet.findFirst({ where: { farmId: member.farmId, petKey: key } }),
    ]);
    if (!pet) throw new Error("宠物不存在");
    if (pet.uniquePerFarm && owned) throw new Error("农场已经有这只宠物了");
    if (farm.lovePoints < pet.unlockLove) throw new Error(`需要 ${pet.unlockLove} 情侣值才能解锁`);
    await prisma.$transaction(async (tx) => {
      const paid = await tx.farm.updateMany({
        where: { id: farm.id, coins: { gte: pet.price } },
        data: { coins: { decrement: pet.price } },
      });
      if (!paid.count) throw new Error("金币不够");
      await tx.farmPet.create({ data: { farmId: farm.id, petKey: key } });
      await tx.farmEventLog.create({ data: { farmId: farm.id, userId, type: "pet_purchased", payload: JSON.stringify({ key }) } });
    });
    emitFarmUpdate(farm.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

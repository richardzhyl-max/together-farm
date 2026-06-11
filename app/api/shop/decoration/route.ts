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
    const [item, farm] = await Promise.all([
      prisma.decorationConfig.findFirst({ where: { key, enabled: true } }),
      prisma.farm.findUniqueOrThrow({ where: { id: member.farmId } }),
    ]);
    if (!item) throw new Error("装饰不存在");
    if (farm.lovePoints < item.unlockLove) throw new Error(`需要 ${item.unlockLove} 情侣值才能解锁`);
    await prisma.$transaction(async (tx) => {
      const paid = await tx.farm.updateMany({
        where: { id: farm.id, coins: { gte: item.price } },
        data: { coins: { decrement: item.price }, lovePoints: { increment: 1 } },
      });
      if (!paid.count) throw new Error("金币不够");
      await tx.farmDecoration.upsert({
        where: { farmId_decorationKey: { farmId: farm.id, decorationKey: key } },
        create: { farmId: farm.id, decorationKey: key },
        update: { quantity: { increment: 1 }, purchasedAt: new Date() },
      });
      await tx.farmEventLog.create({ data: { farmId: farm.id, userId, type: "decoration_purchased", payload: JSON.stringify({ key }) } });
    });
    emitFarmUpdate(farm.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

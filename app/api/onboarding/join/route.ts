import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { apiError, emitFarmUpdate } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({ inviteCode: z.string().trim().length(6, "邀请码应为 6 位").transform((v) => v.toUpperCase()) });

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) throw new Error("未登录");
    if (await prisma.farmMember.findUnique({ where: { userId } })) throw new Error("你已经有农场了");
    const { inviteCode } = schema.parse(await request.json());
    const farm = await prisma.farm.findUnique({ where: { inviteCode }, include: { _count: { select: { members: true } } } });
    if (!farm) throw new Error("邀请码不存在");
    if (farm._count.members >= 2) throw new Error("这个农场已经住满两个人了");
    await prisma.$transaction([
      prisma.farmMember.create({ data: { farmId: farm.id, userId } }),
      prisma.farmEventLog.create({ data: { farmId: farm.id, userId, type: "partner_joined" } }),
    ]);
    emitFarmUpdate(farm.id);
    return NextResponse.json({ ok: true, farmId: farm.id });
  } catch (error) {
    return apiError(error);
  }
}

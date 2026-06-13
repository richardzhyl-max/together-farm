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
    const owned = await prisma.farmPet.findFirst({
      where: { farmId: member.farmId, petKey: key },
    });
    if (!owned) throw new Error("农场尚未拥有这只宠物");

    await prisma.$transaction([
      prisma.farm.update({
        where: { id: member.farmId },
        data: { activePetKey: key },
      }),
      prisma.farmEventLog.create({
        data: {
          farmId: member.farmId,
          userId,
          type: "active_pet_changed",
          payload: JSON.stringify({ key }),
        },
      }),
    ]);
    emitFarmUpdate(member.farmId);
    return NextResponse.json({ ok: true, activePetKey: key });
  } catch (error) {
    return apiError(error);
  }
}

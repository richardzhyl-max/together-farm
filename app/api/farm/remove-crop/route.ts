import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { requireMember } from "@/lib/farm";
import { apiError, emitFarmUpdate } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({ plotId: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) throw new Error("未登录");
    const member = await requireMember(userId);
    const { plotId } = schema.parse(await request.json());
    const plot = await prisma.plot.findFirst({ where: { id: plotId, farmId: member.farmId } });
    if (!plot || !plot.cropKey) throw new Error("这块土地没有作物");

    await prisma.$transaction([
      prisma.plot.update({
        where: { id: plot.id },
        data: {
          cropKey: null,
          plantedAt: null,
          matureAt: null,
          witherAt: null,
          growDurationSeconds: null,
          waterBoostSeconds: 0,
          lastWateredAt: null,
        },
      }),
      prisma.farmEventLog.create({
        data: {
          farmId: member.farmId,
          userId,
          type: "removed_crop",
          payload: JSON.stringify({ plotId, cropKey: plot.cropKey }),
        },
      }),
    ]);

    emitFarmUpdate(member.farmId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

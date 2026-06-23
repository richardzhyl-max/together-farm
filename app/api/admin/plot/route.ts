import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin";
import { apiError, emitFarmUpdate } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    if (!(await isAdmin())) throw new Error("无权访问");
    const { plotId } = z.object({ plotId: z.string().min(1) }).parse(await request.json());
    const plot = await prisma.plot.update({
      where: { id: plotId },
      data: { cropKey: null, plantedAt: null, matureAt: null, witherAt: null, growDurationSeconds: null, waterBoostSeconds: 0, lastWateredAt: null, variantType: null },
    });
    emitFarmUpdate(plot.farmId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

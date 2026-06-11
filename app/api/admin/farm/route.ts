import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin";
import { apiError, emitFarmUpdate } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  farmId: z.string().min(1),
  coins: z.number().int().min(0).max(100000000),
  lovePoints: z.number().int().min(0).max(1000000),
});

export async function PATCH(request: Request) {
  try {
    if (!(await isAdmin())) throw new Error("无权访问");
    const input = schema.parse(await request.json());
    await prisma.farm.update({ where: { id: input.farmId }, data: { coins: input.coins, lovePoints: input.lovePoints } });
    emitFarmUpdate(input.farmId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

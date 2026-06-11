import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("crop"), key: z.string(), price: z.number().int().min(0), sellPrice: z.number().int().min(0) }),
  z.object({ type: z.literal("pet"), key: z.string(), price: z.number().int().min(0), unlockLove: z.number().int().min(0) }),
  z.object({ type: z.literal("decoration"), key: z.string(), price: z.number().int().min(0), unlockLove: z.number().int().min(0) }),
]);

export async function PATCH(request: Request) {
  try {
    if (!(await isAdmin())) throw new Error("无权访问");
    const input = schema.parse(await request.json());
    if (input.type === "crop") await prisma.cropConfig.update({ where: { key: input.key }, data: { seedPrice: input.price, sellPrice: input.sellPrice } });
    if (input.type === "pet") await prisma.petConfig.update({ where: { key: input.key }, data: { price: input.price, unlockLove: input.unlockLove } });
    if (input.type === "decoration") await prisma.decorationConfig.update({ where: { key: input.key }, data: { price: input.price, unlockLove: input.unlockLove } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

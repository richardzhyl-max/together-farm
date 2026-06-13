import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { expansionFor, requireMember } from "@/lib/farm";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) throw new Error("未登录");
    const member = await requireMember(userId);
    const [farm, crops, pets, decorations, ownedPets, ownedDecorations] = await Promise.all([
      prisma.farm.findUniqueOrThrow({ where: { id: member.farmId } }),
      prisma.cropConfig.findMany({ where: { enabled: true }, orderBy: { seedPrice: "asc" } }),
      prisma.petConfig.findMany({ where: { enabled: true }, orderBy: { price: "asc" } }),
      prisma.decorationConfig.findMany({ where: { enabled: true }, orderBy: { price: "asc" } }),
      prisma.farmPet.findMany({ where: { farmId: member.farmId }, select: { petKey: true } }),
      prisma.farmDecoration.findMany({ where: { farmId: member.farmId }, select: { decorationKey: true, quantity: true } }),
    ]);
    return NextResponse.json({
      coins: farm.coins,
      lovePoints: farm.lovePoints,
      activePetKey: farm.activePetKey,
      crops,
      pets,
      decorations,
      ownedPets: ownedPets.map((row) => row.petKey),
      ownedDecorations: Object.fromEntries(ownedDecorations.map((row) => [row.decorationKey, row.quantity])),
      expansion: expansionFor(farm.plotCount),
    });
  } catch (error) {
    return apiError(error);
  }
}

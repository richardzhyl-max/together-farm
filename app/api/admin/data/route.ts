import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    if (!(await isAdmin())) throw new Error("无权访问");
    const [users, farms, crops, pets, decorations] = await Promise.all([
      prisma.user.findMany({ select: { id: true, username: true, createdAt: true, membership: { select: { farmId: true } } }, orderBy: { createdAt: "desc" } }),
      prisma.farm.findMany({ include: { members: { include: { user: { select: { username: true } } } }, plots: { orderBy: { index: "asc" } } }, orderBy: { createdAt: "desc" } }),
      prisma.cropConfig.findMany({ orderBy: { seedPrice: "asc" } }),
      prisma.petConfig.findMany({ orderBy: { price: "asc" } }),
      prisma.decorationConfig.findMany({ orderBy: { price: "asc" } }),
    ]);
    return NextResponse.json({ users, farms, crops, pets, decorations });
  } catch (error) {
    return apiError(error);
  }
}

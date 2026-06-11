import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { requireMember } from "@/lib/farm";
import { apiError, emitFarmUpdate } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({ content: z.string().trim().min(1, "留言不能为空").max(300, "留言最多 300 字") });

function startOfChinaDay() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date()).split("-").map(Number);
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]) - 8 * 60 * 60 * 1000);
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) throw new Error("未登录");
    const member = await requireMember(userId);
    const messages = await prisma.message.findMany({
      where: { farmId: member.farmId },
      include: { user: { select: { id: true, username: true } } },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    return NextResponse.json({ farmId: member.farmId, messages });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) throw new Error("未登录");
    const member = await requireMember(userId);
    const { content } = schema.parse(await request.json());
    const firstToday = !(await prisma.message.findFirst({
      where: { farmId: member.farmId, userId, createdAt: { gte: startOfChinaDay() } },
    }));
    await prisma.$transaction([
      prisma.message.create({ data: { farmId: member.farmId, userId, content } }),
      ...(firstToday ? [prisma.farm.update({ where: { id: member.farmId }, data: { lovePoints: { increment: 1 } } })] : []),
      prisma.farmEventLog.create({ data: { farmId: member.farmId, userId, type: "message_sent", payload: JSON.stringify({ dailyReward: firstToday }) } }),
    ]);
    emitFarmUpdate(member.farmId);
    globalThis.farmSocket?.to(`farm:${member.farmId}`).emit("message:update");
    return NextResponse.json({ ok: true, dailyReward: firstToday });
  } catch (error) {
    return apiError(error);
  }
}

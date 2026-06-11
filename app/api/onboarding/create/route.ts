import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { addPlots } from "@/lib/farm";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({ name: z.string().trim().min(2, "农场名至少 2 个字符").max(24) });

function inviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join("");
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) throw new Error("未登录");
    if (await prisma.farmMember.findUnique({ where: { userId } })) throw new Error("你已经有农场了");
    const { name } = schema.parse(await request.json());
    let code = inviteCode();
    while (await prisma.farm.findUnique({ where: { inviteCode: code } })) code = inviteCode();
    const farm = await prisma.$transaction(async (tx) => {
      const created = await tx.farm.create({
        data: { name, inviteCode: code, members: { create: { userId, role: "owner" } } },
      });
      await addPlots(tx, created.id, 0, 4);
      await tx.farmEventLog.create({ data: { farmId: created.id, userId, type: "farm_created" } });
      return created;
    });
    return NextResponse.json({ ok: true, farmId: farm.id });
  } catch (error) {
    return apiError(error);
  }
}

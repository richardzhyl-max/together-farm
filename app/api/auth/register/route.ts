import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  username: z.string().trim().min(2, "用户名至少 2 个字符").max(20, "用户名最多 20 个字符").regex(/^[\p{L}\p{N}_-]+$/u, "用户名只能包含文字、数字、下划线或短横线"),
  password: z.string().min(6, "密码至少 6 位").max(72),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const exists = await prisma.user.findUnique({ where: { username: input.username } });
    if (exists) throw new Error("这个用户名已经被使用");
    const user = await prisma.user.create({
      data: { username: input.username, passwordHash: await bcrypt.hash(input.password, 12) },
    });
    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

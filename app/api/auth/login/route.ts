import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({ username: z.string().trim().min(1), password: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { username: input.username } });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new Error("用户名或密码不正确");
    }
    await createSession(user.id);
    return NextResponse.json({ ok: true, hasFarm: Boolean(await prisma.farmMember.findUnique({ where: { userId: user.id } })) });
  } catch (error) {
    return apiError(error);
  }
}

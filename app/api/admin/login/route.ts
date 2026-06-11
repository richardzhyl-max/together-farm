import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE } from "@/lib/admin";
import { apiError } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const { password } = z.object({ password: z.string().min(1) }).parse(await request.json());
    if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) throw new Error("管理员密码不正确");
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE, password, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 86400 });
    return response;
  } catch (error) {
    return apiError(error);
  }
}

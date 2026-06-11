import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { getJwtSecret } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

export async function createSession(userId: string) {
  const secret = new TextEncoder().encode(getJwtSecret());
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

export async function getUserId() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const userId = await verifySessionToken(token);
    if (!userId) return null;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    return user?.id ?? null;
  } catch {
    return null;
  }
}

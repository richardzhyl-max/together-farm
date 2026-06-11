import { jwtVerify } from "jose";
import { getJwtSecret } from "@/lib/env";

export const SESSION_COOKIE_NAME = "together_farm_session";

export async function verifySessionToken(token: string) {
  const secret = new TextEncoder().encode(getJwtSecret());
  const { payload } = await jwtVerify(token, secret);
  return typeof payload.userId === "string" ? payload.userId : null;
}

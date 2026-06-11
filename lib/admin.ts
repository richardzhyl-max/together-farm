import { cookies } from "next/headers";

export const ADMIN_COOKIE = "together_farm_admin";

export async function isAdmin() {
  return (await cookies()).get(ADMIN_COOKIE)?.value === process.env.ADMIN_PASSWORD;
}

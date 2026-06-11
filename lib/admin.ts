import { cookies } from "next/headers";
import { getAdminPassword } from "@/lib/env";

export const ADMIN_COOKIE = "together_farm_admin";

export async function isAdmin() {
  return (await cookies()).get(ADMIN_COOKIE)?.value === getAdminPassword();
}

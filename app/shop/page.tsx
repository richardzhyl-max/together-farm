import { redirect } from "next/navigation";
import ShopClient from "@/components/ShopClient";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ShopPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  if (!(await prisma.farmMember.findUnique({ where: { userId } }))) redirect("/onboarding");
  return <ShopClient />;
}

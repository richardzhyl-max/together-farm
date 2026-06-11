import { redirect } from "next/navigation";
import FarmClient from "@/components/FarmClient";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function FarmPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  if (!(await prisma.farmMember.findUnique({ where: { userId } }))) redirect("/onboarding");
  return <FarmClient />;
}

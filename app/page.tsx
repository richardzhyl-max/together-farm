import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const member = await prisma.farmMember.findUnique({ where: { userId } });
  redirect(member ? "/farm" : "/onboarding");
}

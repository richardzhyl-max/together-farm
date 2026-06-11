import { redirect } from "next/navigation";
import Onboarding from "@/components/Onboarding";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function OnboardingPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { membership: true } });
  if (!user) redirect("/login");
  if (user.membership) redirect("/farm");
  return <Onboarding username={user.username} />;
}

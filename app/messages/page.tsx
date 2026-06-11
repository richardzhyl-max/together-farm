import { redirect } from "next/navigation";
import MessagesClient from "@/components/MessagesClient";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function MessagesPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  if (!(await prisma.farmMember.findUnique({ where: { userId } }))) redirect("/onboarding");
  return <MessagesClient userId={userId} />;
}

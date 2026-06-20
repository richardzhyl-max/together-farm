import { redirect } from "next/navigation";
import OrdersClient from "@/components/OrdersClient";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function OrdersPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  if (!(await prisma.farmMember.findUnique({ where: { userId } }))) redirect("/onboarding");
  return <OrdersClient />;
}

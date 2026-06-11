import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { farmSnapshot } from "@/lib/farm";
import { apiError } from "@/lib/http";

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) throw new Error("未登录");
    return NextResponse.json(await farmSnapshot(userId));
  } catch (error) {
    return apiError(error);
  }
}

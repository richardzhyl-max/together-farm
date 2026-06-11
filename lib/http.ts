import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function apiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: error.issues[0]?.message || "提交内容不正确" },
      { status: 400 },
    );
  }
  const message = error instanceof Error ? error.message : "操作失败，请稍后重试";
  const status =
    message.includes("未登录") ? 401 :
    message.includes("无权") ? 403 :
    message.includes("不存在") ? 404 : 400;
  return NextResponse.json({ error: message }, { status });
}

export function emitFarmUpdate(farmId: string) {
  globalThis.farmSocket?.to(`farm:${farmId}`).emit("farm:update", { farmId });
}

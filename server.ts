import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { validateProductionEnv } from "./lib/env";
import { prisma } from "./lib/prisma";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./lib/session";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = Number(process.env.PORT || 3000);
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

async function start() {
  validateProductionEnv();
  await app.prepare();

  const httpServer = createServer(handler);
  const io = new Server(httpServer, { path: "/socket.io" });

  io.on("connection", (socket) => {
    socket.on("farm:join", async (farmId: string) => {
      if (typeof farmId !== "string" || farmId.length > 100) return;
      try {
        const cookieHeader = socket.handshake.headers.cookie || "";
        const token = cookieHeader
          .split(";")
          .map((cookie) => cookie.trim().split("="))
          .find(([name]) => name === SESSION_COOKIE_NAME)?.slice(1).join("=");
        if (!token) return;
        const userId = await verifySessionToken(decodeURIComponent(token));
        if (!userId) return;
        const member = await prisma.farmMember.findFirst({
          where: { farmId, userId },
          select: { id: true },
        });
        if (member) await socket.join(`farm:${farmId}`);
      } catch {
        socket.emit("farm:error", { message: "无法加入农场实时频道" });
      }
    });
  });

  globalThis.farmSocket = io;

  httpServer.listen(port, hostname, () => {
    console.log(`> Together Farm ready at http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});

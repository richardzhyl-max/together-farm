import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = Number(process.env.PORT || 3000);
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

async function start() {
  await app.prepare();

  const httpServer = createServer(handler);
  const io = new Server(httpServer, { path: "/socket.io" });

  io.on("connection", (socket) => {
    socket.on("farm:join", (farmId: string) => {
      if (typeof farmId === "string" && farmId.length < 100) socket.join(`farm:${farmId}`);
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

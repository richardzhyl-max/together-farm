import type { Server } from "socket.io";

declare global {
  var farmSocket: Server | undefined;
}

export {};

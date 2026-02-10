const { Server } = require("socket.io");
const { env } = require("../config/env");
const { socketAuthMiddleware } = require("../modules/auth/token");
const { registerRoomHandlers } = require("../modules/rooms/handlers");

function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN, credentials: true },
  });

  // Auth middleware (token)
  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    console.log(`[socket] connected ${socket.id} user=${socket.user?.userId}`);
    registerRoomHandlers(io, socket);

    socket.on("disconnect", (reason) => {
      console.log(`[socket] disconnected ${socket.id} reason=${reason}`);
    });
  });

  return io;
}

module.exports = { createSocketServer };

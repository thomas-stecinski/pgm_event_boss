const { nanoid } = require("nanoid");
const { createRoomSchema, joinRoomSchema } = require("./schema");
const { createRoom, getRoom, getPlayers, addPlayer, removePlayer, deleteRoom, getAllRooms } = require("./redis");
const gameRedis = require("../game/redis");

function emitRoomState(io, roomId) {
  return (async () => {
    const room = await getRoom(roomId);
    const players = await getPlayers(roomId);
    io.to(roomId).emit("room:update", { room, players });
  })();
}

async function emitRoomList(io) {
  const rooms = await getAllRooms();
  io.emit("room:list:update", { rooms });
}

async function assignTeam(roomId, user) {
  if(user.team) return user.team;
  const players = await getPlayers(roomId);
  const countA = players.filter((p) => p.team === "A").length;
  const countB = players.filter((p) => p.team === "B").length;

  const team = countA <= countB ? "A" : "B";

  await gameRedis.setPlayerTeam(roomId, user.userId, { ...user, team });

  return team;
}
function registerRoomHandlers(io, socket) {
  // Utils: join socket room + store current room
  socket.data.currentRoomId = null;

  socket.on("room:create", async (payload, ack) => {
    try {
      const { roomId: maybeId } = createRoomSchema.parse(payload ?? {});
      const roomId = maybeId || nanoid(6);
      const room = await createRoom({
        roomId,
        hostUser: socket.user,
      });
      const team = await assignTeam(roomId, socket.user);


      await socket.join(roomId);
      socket.data.currentRoomId = roomId;
      io.emit("game:myTeam", { team });

      await emitRoomState(io, roomId);
      await emitRoomList(io);

      ack?.({ ok: true, roomId, room, team});
    } catch (e) {
      ack?.({ ok: false, error: e.message || "CREATE_ROOM_FAILED" });
    }
  });
    socket.on("room:list", async (payload, ack) => {
    try {
      const { onlyWaiting } = payload ?? {};
      const rooms = await getAllRooms({ onlyWaiting });

      ack?.({ ok: true, rooms });
    } catch (e) {
      ack?.({ ok: false, error: "LIST_ROOMS_FAILED" });
    }
  });


  socket.on("room:join", async (payload, ack) => {
    try {
      const { roomId } = joinRoomSchema.parse(payload);

      const room = await getRoom(roomId);
      if (!room) return ack?.({ ok: false, error: "ROOM_NOT_FOUND" });

      await addPlayer(roomId, socket.user);
      const team = await assignTeam(roomId, socket.user);

      await socket.join(roomId);
      socket.data.currentRoomId = roomId;

      socket.emit("game:myTeam", { team });

      await emitRoomState(io, roomId);
      await emitRoomList(io);

      ack?.({ ok: true, roomId, team});
    } catch (e) {
      ack?.({ ok: false, error: e.message || "JOIN_ROOM_FAILED" });
    }
  });

  socket.on("room:leave", async (_, ack) => {
    try {
      const roomId = socket.data.currentRoomId;
      if (!roomId) return ack?.({ ok: true });

      const room = await getRoom(roomId);
      const isHost = room && room.hostUserId === socket.user.userId;

      await removePlayer(roomId, socket.user.userId);
      await socket.leave(roomId);
      socket.data.currentRoomId = null;

      if (isHost) {
        io.to(roomId).emit("room:deleted", { roomId, reason: "HOST_LEFT" });
        await deleteRoom(roomId);
      } else {
        const players = await getPlayers(roomId);
        if (players.length === 0) {
          await deleteRoom(roomId);
        } else {
          await emitRoomState(io, roomId);
        }
      }

      await emitRoomList(io);

      ack?.({ ok: true });
    } catch (e) {
      ack?.({ ok: false, error: e.message || "LEAVE_ROOM_FAILED" });
    }
  });

  socket.on("disconnect", async () => {
    const roomId = socket.data.currentRoomId;
    if (!roomId) return;

    const room = await getRoom(roomId);
    const isHost = room && room.hostUserId === socket.user.userId;

    await removePlayer(roomId, socket.user.userId);

    if (isHost) {
      io.to(roomId).emit("room:deleted", { roomId, reason: "HOST_LEFT" });
      await deleteRoom(roomId);
    } else {
      const players = await getPlayers(roomId);
      if (players.length === 0) {
        await deleteRoom(roomId);
      } else {
        await emitRoomState(io, roomId);
      }
    }

    await emitRoomList(io);
  });
}

module.exports = { registerRoomHandlers };

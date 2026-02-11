const { nanoid } = require("nanoid");
const { createRoomSchema, joinRoomSchema } = require("./schema");
const { createRoom, getRoom, getPlayers, addPlayer, removePlayer } = require("./redis");
const gameRedis = require("../game/redis");

function emitRoomState(io, roomId) {
  return (async () => {
    const room = await getRoom(roomId);
    const players = await getPlayers(roomId);
    io.to(roomId).emit("room:update", { room, players });
  })();
}

async function assignTeam(roomId, user) {
  const players = await gameRedis.getPlayers(roomId);
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
      await assignTeam(roomId, socket.user);


      await socket.join(roomId);
      socket.data.currentRoomId = roomId;

      await emitRoomState(io, roomId);

      ack?.({ ok: true, roomId, room });
    } catch (e) {
      ack?.({ ok: false, error: e.message || "CREATE_ROOM_FAILED" });
    }
  });

  socket.on("room:join", async (payload, ack) => {
    try {
      const { roomId } = joinRoomSchema.parse(payload);

      const room = await getRoom(roomId);
      if (!room) return ack?.({ ok: false, error: "ROOM_NOT_FOUND" });

      await addPlayer(roomId, socket.user);
      await assignTeam(roomId, socket.user);

      await socket.join(roomId);
      socket.data.currentRoomId = roomId;

      await emitRoomState(io, roomId);

      ack?.({ ok: true, roomId });
    } catch (e) {
      ack?.({ ok: false, error: e.message || "JOIN_ROOM_FAILED" });
    }
  });

  socket.on("room:leave", async (_, ack) => {
    try {
      const roomId = socket.data.currentRoomId;
      if (!roomId) return ack?.({ ok: true });

      await removePlayer(roomId, socket.user.userId);
      await socket.leave(roomId);
      socket.data.currentRoomId = null;

      await emitRoomState(io, roomId);
      ack?.({ ok: true });
    } catch (e) {
      ack?.({ ok: false, error: e.message || "LEAVE_ROOM_FAILED" });
    }
  });

  socket.on("disconnect", async () => {
    const roomId = socket.data.currentRoomId;
    if (!roomId) return;
    await removePlayer(roomId, socket.user.userId);
    await emitRoomState(io, roomId);
  });
}

module.exports = { registerRoomHandlers };

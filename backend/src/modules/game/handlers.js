const { gameStartSchema, gameClickSchema } = require("./schema");
const gameRedis = require("./redis");

const roomTimers = new Map();

async function emitScore(io, roomId) {
  const scores = await gameRedis.getScores(roomId);
  io.to(roomId).emit("game:score:update", { roomId, scores });
}

function startRoomTimer(io, roomId, endsAt) {
  if (roomTimers.has(roomId)) return;

  const intervalId = setInterval(async () => {
    const now = Date.now();
    // mis à jour timer
    const timeLeftMs = Math.max(0, endsAt - now);

    // Diffuse le timer à toute la room
    io.to(roomId).emit("game:timer", {
      roomId,
      timeLeftMs,
      endsAt,
    });

    // Si le timer est à 0, termine la partie
    if (timeLeftMs <= 0) {
      clearInterval(intervalId);
      roomTimers.delete(roomId);

        // Met à jour le statut de la rooms
      await gameRedis.setRoomStatus(roomId, "FINISHED");
    //   Recupere les scores
      const scores = await gameRedis.getScores(roomId);
    //   Determine le gagnant
      const winner = scores.A === scores.B ? "DRAW" : (scores.A > scores.B ? "A" : "B");

        // Diffuse la fin de la partie + scores + gagnant
      io.to(roomId).emit("game:end", { roomId, scores, winner });
    }
  }, 500); // Toute les 500ms change le timer

  roomTimers.set(roomId, intervalId);
}

async function stopRoomTimer(roomId) {
  const intervalId = roomTimers.get(roomId);
  if (intervalId) {
    clearInterval(intervalId);
    roomTimers.delete(roomId);
  }
}

function registerGameHandlers(io, socket) {
  socket.on("game:start", async (payload, ack) => {
    try {
      const { roomId: pRoomId, durationSec : pDurationSec} = gameStartSchema.parse(payload ?? {});
      const roomId = pRoomId || socket.data.currentRoomId;
      const durationSec = pDurationSec || 90; 
        // Pas de roomId dans le payload ni dans le socket : erreur
      if (!roomId) return ack?.({ ok: false, error: "NO_ROOM" });

    // Récupère la room depuis Redis 
    // Verifie excistance + créateur + status
      const room = await gameRedis.getRoom(roomId);
      if (!room) return ack?.({ ok: false, error: "ROOM_NOT_FOUND" });

    //   Seul le créateur de la room peut lancer la partie
      if (room.hostUserId !== socket.user.userId) {
        return ack?.({ ok: false, error: "FORBIDDEN_HOST_ONLY" });
      }

      // status
      if (room.status && room.status !== "WAITING") {
        return ack?.({ ok: false, error: "ROOM_NOT_WAITING" });
      }

    // 90 secondes de jeu
      const endsAt = Date.now() + durationSec * 1000;

    //Statut de la room fini
      await gameRedis.setRoomStatus(roomId, "IN_GAME");

    //Init tout
      await gameRedis.setRoomEndsAt(roomId, endsAt);
      await gameRedis.resetScores(roomId);
      await gameRedis.resetPlayerScores(roomId);


      // Diffuse start + score reset
      io.to(roomId).emit("game:start", { roomId, endsAt, durationMs: 90_000 });
      await emitScore(io, roomId);

      // Start timer
      startRoomTimer(io, roomId, endsAt);

      ack?.({ ok: true, roomId, endsAt });
    } catch (e) {
      ack?.({ ok: false, error: e?.message || "GAME_START_FAILED" });
    }
  });

// Joueur qui clique pendant la partie
  socket.on("game:click", async (payload, ack) => {
    try {
      const { roomId: pRoomId } = gameClickSchema.parse(payload ?? {});
    // roomId dans le paylaod ou dans le socket
      const roomId = pRoomId || socket.data.currentRoomId;
      if (!roomId) return ack?.({ ok: false, error: "NO_ROOM" });

      const room = await gameRedis.getRoom(roomId);
      if (!room) return ack?.({ ok: false, error: "ROOM_NOT_FOUND" });

      // doit être en jeu
      if (room.status !== "IN_GAME") {
        return ack?.({ ok: false, error: "NOT_IN_GAME" });
      }

      const endsAt = Number(room.endsAt || 0);
      const now = Date.now();
      if (!endsAt || now >= endsAt) {
        return ack?.({ ok: false, error: "GAME_ALREADY_ENDED" });
      }

      // joueur doit exister + team requise
      const player = await gameRedis.getPlayer(roomId, socket.user.userId);
      if (!player) return ack?.({ ok: false, error: "PLAYER_NOT_IN_ROOM" });
      if (!player.team) return ack?.({ ok: false, error: "PLAYER_NO_TEAM" });

      //  Max 1 clique tout les 50ms 
      const last = await gameRedis.getLastClickTs(roomId, socket.user.userId);
      if (last && now - last < 50) {
        return ack?.({ ok: false, error: "RATE_LIMIT" });
      }
      await gameRedis.setLastClickTs(roomId, socket.user.userId, now);

      const newPersonalScore = await gameRedis.incrPlayerScore(roomId, socket.user.userId, 1);
      // incr score team
      await gameRedis.incrScore(roomId, player.team);

      // diffuse nouveau score à toute la room
      await emitScore(io, roomId);

      socket.emit("game:personalScore:update", {
            roomId,
            userId: socket.user.userId,
            personalScore: newPersonalScore,
            });

      ack?.({ ok: true });
    } catch (e) {
      ack?.({ ok: false, error: e?.message || "GAME_CLICK_FAILED" });
    }
  });

}

module.exports = { registerGameHandlers, stopRoomTimer };

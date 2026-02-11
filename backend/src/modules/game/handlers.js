const { gameStartSchema, gameClickSchema, gameChoosePowerSchema } = require("./schema");
const gameRedis = require("./redis");
const { calculateDamage, getRandomOffers } = require("./powers");

const roomTimers = new Map();

async function emitScore(io, roomId) {
  const scores = await gameRedis.getScores(roomId);
  io.to(roomId).emit("game:score:update", { roomId, scores });
}

function startRoomTimer(io, roomId, choosingEndsAt, endsAt) {
  if (roomTimers.has(roomId)) return;

  let gameStarted = false;

  const intervalId = setInterval(async () => {
    const now = Date.now();

    // Phase CHOOSING (6 premieres secondes)
    if (now < choosingEndsAt) {
      const choosingLeftMs = Math.max(0, choosingEndsAt - now);
      io.to(roomId).emit("game:timer", {
        roomId,
        phase: "CHOOSING",
        timeLeftMs: choosingLeftMs,
      });
      return;
    }

    // Transition CHOOSING -> PLAYING (une seule fois)
    if (!gameStarted) {
      gameStarted = true;
      io.to(roomId).emit("game:play", { roomId, endsAt, durationMs: endsAt - choosingEndsAt });
    }

    // Phase PLAYING
    const timeLeftMs = Math.max(0, endsAt - now);

    io.to(roomId).emit("game:timer", {
      roomId,
      phase: "PLAYING",
      timeLeftMs,
      endsAt,
    });

    // Fin de partie
    if (timeLeftMs <= 0) {
      clearInterval(intervalId);
      roomTimers.delete(roomId);

      await gameRedis.setRoomStatus(roomId, "FINISHED");
      const scores = await gameRedis.getScores(roomId);
      const winner = scores.A === scores.B ? "DRAW" : (scores.A > scores.B ? "A" : "B");

      io.to(roomId).emit("game:end", { roomId, scores, winner });
    }
  }, 500);

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

      const room = await gameRedis.getRoom(roomId);
      if (!room) return ack?.({ ok: false, error: "ROOM_NOT_FOUND" });

      if (room.hostUserId !== socket.user.userId) {
        return ack?.({ ok: false, error: "FORBIDDEN_HOST_ONLY" });
      }

      if (room.status && room.status !== "WAITING") {
        return ack?.({ ok: false, error: "ROOM_NOT_WAITING" });
      }

      const now = Date.now();
      const choosingEndsAt = now + 6_000;
      const endsAt = now + 6_000 + durationSec * 1000;

    //Statut de la room fini
      await gameRedis.setRoomStatus(roomId, "IN_GAME");
      await gameRedis.setRoomChoosingEndsAt(roomId, choosingEndsAt);
      await gameRedis.setRoomEndsAt(roomId, endsAt);
      await gameRedis.resetScores(roomId);
      await gameRedis.resetPlayerScores(roomId);
      await gameRedis.resetPowers(roomId);
      await gameRedis.resetOffers(roomId);
      await gameRedis.resetClickCounts(roomId);

      // Generer 3 pouvoirs aleatoires par joueur et les stocker
      const players = await gameRedis.getPlayers(roomId);
      for (const p of players) {
        const offers = getRandomOffers(3);
        await gameRedis.setPlayerOffers(roomId, p.userId, offers);
      }

      // Diffuse le debut de la phase de choix a toute la room
      io.to(roomId).emit("game:choosing", {
        roomId,
        choosingEndsAt,
        endsAt,
        durationMs: 90_000,
      });

      // Envoie les offres personnelles a chaque socket de la room
      const sockets = await io.in(roomId).fetchSockets();
      for (const s of sockets) {
        const offers = await gameRedis.getPlayerOffers(roomId, s.user.userId);
        if (offers) {
          s.emit("game:offers", { roomId, offers });
        }
      }

      await emitScore(io, roomId);

      // Demarre le timer (gere les 2 phases)
      startRoomTimer(io, roomId, choosingEndsAt, endsAt);

      ack?.({ ok: true, roomId, choosingEndsAt, endsAt });
    } catch (e) {
      ack?.({ ok: false, error: e?.message || "GAME_START_FAILED" });
    }
  });

  // Choix du pouvoir pendant la phase CHOOSING
  socket.on("game:choosePower", async (payload, ack) => {
    try {
      const { roomId: pRoomId, powerId } = gameChoosePowerSchema.parse(payload ?? {});
      const roomId = pRoomId || socket.data.currentRoomId;
      if (!roomId) return ack?.({ ok: false, error: "NO_ROOM" });

      const room = await gameRedis.getRoom(roomId);
      if (!room) return ack?.({ ok: false, error: "ROOM_NOT_FOUND" });

      if (room.status !== "IN_GAME") {
        return ack?.({ ok: false, error: "NOT_IN_GAME" });
      }

      // Verifier qu'on est encore en phase de choix
      const choosingEndsAt = Number(room.choosingEndsAt || 0);
      if (!choosingEndsAt || Date.now() >= choosingEndsAt) {
        return ack?.({ ok: false, error: "CHOOSING_PHASE_ENDED" });
      }

      const player = await gameRedis.getPlayer(roomId, socket.user.userId);
      if (!player) return ack?.({ ok: false, error: "PLAYER_NOT_IN_ROOM" });

      // Verifier que le pouvoir fait partie des 3 offerts au joueur
      const offers = await gameRedis.getPlayerOffers(roomId, socket.user.userId);
      if (!offers || !offers.includes(powerId)) {
        return ack?.({ ok: false, error: "POWER_NOT_OFFERED" });
      }

      await gameRedis.setPlayerPower(roomId, socket.user.userId, powerId);

      ack?.({ ok: true, powerId });
    } catch (e) {
      ack?.({ ok: false, error: e?.message || "CHOOSE_POWER_FAILED" });
    }
  });

  // Joueur qui clique pendant la partie
  socket.on("game:click", async (payload, ack) => {
    try {
      const { roomId: pRoomId } = gameClickSchema.parse(payload ?? {});
      const roomId = pRoomId || socket.data.currentRoomId;
      if (!roomId) return ack?.({ ok: false, error: "NO_ROOM" });

      const room = await gameRedis.getRoom(roomId);
      if (!room) return ack?.({ ok: false, error: "ROOM_NOT_FOUND" });

      if (room.status !== "IN_GAME") {
        return ack?.({ ok: false, error: "NOT_IN_GAME" });
      }

      const now = Date.now();

      // Rejeter les clics pendant la phase de choix
      const choosingEndsAt = Number(room.choosingEndsAt || 0);
      if (choosingEndsAt && now < choosingEndsAt) {
        return ack?.({ ok: false, error: "CHOOSING_PHASE" });
      }

      const endsAt = Number(room.endsAt || 0);
      if (!endsAt || now >= endsAt) {
        return ack?.({ ok: false, error: "GAME_ALREADY_ENDED" });
      }

      const player = await gameRedis.getPlayer(roomId, socket.user.userId);
      if (!player) return ack?.({ ok: false, error: "PLAYER_NOT_IN_ROOM" });
      if (!player.team) return ack?.({ ok: false, error: "PLAYER_NO_TEAM" });

      // Rate limit : max 1 clic toutes les 50ms
      const last = await gameRedis.getLastClickTs(roomId, socket.user.userId);
      if (last && now - last < 50) {
        return ack?.({ ok: false, error: "RATE_LIMIT" });
      }
      await gameRedis.setLastClickTs(roomId, socket.user.userId, now);

      // Compteur de clics bruts (pour Bombe / Furie)
      const clickCount = await gameRedis.incrClickCount(roomId, socket.user.userId);

      // Pouvoir du joueur (defaut = premier pouvoir offert)
      let powerId = await gameRedis.getPlayerPower(roomId, socket.user.userId);
      if (!powerId) {
        const offers = await gameRedis.getPlayerOffers(roomId, socket.user.userId);
        powerId = offers ? offers[0] : "double_impact";
      }

      // Progression du jeu (pour Retardement) : 0 a 1
      const gameDuration = endsAt - choosingEndsAt;
      const elapsed = now - choosingEndsAt;
      const gameProgress = Math.min(1, elapsed / gameDuration);

      // Calcul des degats cote serveur
      const damage = calculateDamage(powerId, clickCount, gameProgress);

      // Appliquer les degats
      const newPersonalScore = await gameRedis.incrPlayerScore(roomId, socket.user.userId, damage);
      await gameRedis.incrScore(roomId, player.team, damage);

      // Diffuser les scores
      await emitScore(io, roomId);

      socket.emit("game:personalScore:update", {
        roomId,
        userId: socket.user.userId,
        personalScore: newPersonalScore,
      });

      ack?.({ ok: true, damage });
    } catch (e) {
      ack?.({ ok: false, error: e?.message || "GAME_CLICK_FAILED" });
    }
  });
}

module.exports = { registerGameHandlers, stopRoomTimer };

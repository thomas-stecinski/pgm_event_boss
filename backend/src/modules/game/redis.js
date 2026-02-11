const { redis } = require("../../redis/client");

function roomKey(roomId) {
  return `room:${roomId}`;
}
function playersKey(roomId) {
  return `room:${roomId}:players`;
}
function scoresKey(roomId) {
  return `room:${roomId}:scores`;
}
function clicksKey(roomId) {
  return `room:${roomId}:clicks`;
}

function playerScoresKey(roomId) {
  return `room:${roomId}:playerScores`;
}
function powersKey(roomId) {
  return `room:${roomId}:powers`;
}
function offersKey(roomId) {
  return `room:${roomId}:offers`;
}
function clickCountsKey(roomId) {
  return `room:${roomId}:clickCounts`;
}

async function getRoom(roomId) {
  const room = await redis.hgetall(roomKey(roomId));
  return room && room.roomId ? room : null;
}

async function getPlayers(roomId) {
  const map = await redis.hgetall(playersKey(roomId));
  return Object.entries(map).map(([userId, json]) => {
    const u = JSON.parse(json);
    return { userId, name: u.name, team: u.team };
  });
}

async function setRoomStatus(roomId, status) {
  await redis.hset(roomKey(roomId), { status });
}

async function setRoomEndsAt(roomId, endsAt) {
  await redis.hset(roomKey(roomId), { endsAt: String(endsAt) });
}

async function resetScores(roomId) {
  await redis.hset(scoresKey(roomId), { A: "0", B: "0" });
}

// Récupère les scores actuels d'une room
async function getScores(roomId) {
  const s = await redis.hgetall(scoresKey(roomId));
  return {
    A: Number(s.A || 0),
    B: Number(s.B || 0),
  };
}

// Augmente le score en fonction de l'équipe A ou B
async function incrScore(roomId, team, amount = 1) {
  const value = await redis.hincrby(scoresKey(roomId), team, amount);
  return Number(value);
}

// Assigne un joueur à l'équipe A ou B
async function setPlayerTeam(roomId, userId, user) {
  await redis.hset(playersKey(roomId), userId, JSON.stringify(user));
}

async function getPlayer(roomId, userId) {
  const json = await redis.hget(playersKey(roomId), userId);
  return json ? JSON.parse(json) : null;
}

// Récupère la date du dernier click d'un joueur, anti-triche
async function getLastClickTs(roomId, userId) {
  const v = await redis.hget(clicksKey(roomId), userId);
  return v ? Number(v) : null;
}

// Enregistre la date du dernier click d'un joueur, anti-triche
async function setLastClickTs(roomId, userId, ts) {
  await redis.hset(clicksKey(roomId), userId, String(ts));
}

// Delete les scores individuels des joueurs d'une room
async function resetPlayerScores(roomId) {
  await redis.del(playerScoresKey(roomId));
}

async function getPlayerScore(roomId, userId) {
  const v = await redis.hget(playerScoresKey(roomId), userId);
  return v ? Number(v) : 0;
}

// Incrémente le score individuel d'un joueur
async function incrPlayerScore(roomId, userId, point = 1) {
    const value = await redis.hincrby(playerScoresKey(roomId), userId, point);
  return Number(value);
}

async function getAllPlayerScores(roomId) {
  const map = await redis.hgetall(playerScoresKey(roomId)); 
  const scores = {};
  for (const [uid, s] of Object.entries(map)) scores[uid] = Number(s);
  return scores;
}


// --- Pouvoirs ---

async function setPlayerPower(roomId, userId, powerId) {
  await redis.hset(powersKey(roomId), userId, powerId);
}

async function getPlayerPower(roomId, userId) {
  return await redis.hget(powersKey(roomId), userId);
}

async function resetPowers(roomId) {
  await redis.del(powersKey(roomId));
}

// --- Offres de pouvoirs (3 aleatoires par joueur) ---

async function setPlayerOffers(roomId, userId, offers) {
  await redis.hset(offersKey(roomId), userId, JSON.stringify(offers));
}

async function getPlayerOffers(roomId, userId) {
  const json = await redis.hget(offersKey(roomId), userId);
  return json ? JSON.parse(json) : null;
}

async function resetOffers(roomId) {
  await redis.del(offersKey(roomId));
}

// --- Compteur de clics bruts (pour Bombe / Furie) ---

async function incrClickCount(roomId, userId) {
  const value = await redis.hincrby(clickCountsKey(roomId), userId, 1);
  return Number(value);
}

async function resetClickCounts(roomId) {
  await redis.del(clickCountsKey(roomId));
}

// --- choosingEndsAt (phase de selection de pouvoir) ---

async function setRoomChoosingEndsAt(roomId, ts) {
  await redis.hset(roomKey(roomId), { choosingEndsAt: String(ts) });
}

module.exports = {
    getRoom,
    getPlayers,
    getPlayer,
    setPlayerTeam,
    setRoomStatus,
    setRoomEndsAt,
    setRoomChoosingEndsAt,
    resetScores,
    getScores,
    incrScore,
    getLastClickTs,
    setLastClickTs,
    resetPlayerScores,
    getPlayerScore,
    incrPlayerScore,
    getAllPlayerScores,
    setPlayerPower,
    getPlayerPower,
    resetPowers,
    setPlayerOffers,
    getPlayerOffers,
    resetOffers,
    incrClickCount,
    resetClickCounts,
};

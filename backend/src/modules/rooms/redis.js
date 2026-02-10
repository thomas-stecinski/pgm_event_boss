const { redis } = require ("../../redis/client");

function roomKey(roomId){
    return `room:${roomId}`;
}

function playersKey(roomId){
    return `room:${roomId}:players`;
}

async function createRoom ({ roomId, hostUser }) {
    const room = {
        roomId, 
        hostUserId: hostUser.userId,
        status : "WAITING",
        createdAt: Date.now()
    };

    //room meta
    await redis.hset(roomKey(roomId), room);

    //host comme joueur
    await redis.hset(playersKey(roomId), hostUser.userId, JSON.stringify(hostUser));

    return room;
}

async function getRoom(roomId){
    const room = await redis.hgetall(roomKey(roomId));
    if(!room || !room.roomId) return null;
    return room;
}

async function getPlayers(roomId)  {
    const map = await redis.hgetall(playersKey(roomId));
    return Object.entries(map).map(([userId, json]) => {
        const u = JSON.parse(json);
        return { userId, name: u.name };
    });
}

async function addPlayer(roomId, user) {
  await redis.hset(playersKey(roomId), user.userId, JSON.stringify(user));
}


async function removePlayer(roomId, userId) {
  await redis.hdel(playersKey(roomId), userId);
}


module.exports = {
  createRoom,
  getRoom,
  getPlayers,
  addPlayer,
  removePlayer,
};
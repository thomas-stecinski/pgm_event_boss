const { redis } = require ("../../redis/client");

function roomKey(roomId){
    return `room:${roomId}`;
}

function playersKey(roomId){
    return `room:${roomId}:players`;
}

const ROOMS_INDEX = "rooms:index";


async function createRoom ({ roomId, hostUser }) {
    const room = {
        roomId, 
        hostUserId: hostUser.userId,
        status : "WAITING",
        createdAt: Date.now().toString()
    };

    //room meta
    await redis.hset(roomKey(roomId), room);

    //host comme joueur
    await redis.hset(playersKey(roomId), hostUser.userId, JSON.stringify(hostUser));

    await redis.sadd("rooms:index", roomId);

    return room;
}

async function getRoom(roomId){
    const room = await redis.hgetall(roomKey(roomId));
    if(!room || !room.roomId) return null;
    return room;
}

async function getPlayers(roomId){  
    const map = await redis.hgetall(playersKey(roomId));
    return Object.entries(map).map(([userId, json]) => {
        const u = JSON.parse(json);
        return { userId, name: u.name, team: u.team };
    });
}

async function addPlayer(roomId, user) {
  await redis.hset(playersKey(roomId), user.userId, JSON.stringify(user));
}


async function removePlayer(roomId, userId) {
  await redis.hdel(playersKey(roomId), userId);
}

// Delete room 

async function deleteRoom(roomId) {
  await redis.del(roomKey(roomId));
  await redis.del(playersKey(roomId));
  await redis.srem(ROOMS_INDEX, roomId);
}

// Get All Rooms

async function getAllRooms ({ onlyWaiting = false} = {}, userId = null) {
    const roomIds = await redis.smembers(ROOMS_INDEX);

     if (!roomIds.length) return [];

  const rooms = await Promise.all(
    roomIds.map(async (roomId) => {
      const room = await redis.hgetall(roomKey(roomId));
      if (!room || !room.roomId) return null;

      const playersCount = await redis.hlen(playersKey(roomId));

      return {
        ...room,
        playersCount
      };
    })
  );

  const validRooms = rooms.filter(Boolean);


  const waitingRooms =  validRooms.filter((r) => r.status === "WAITING");

  const playingRooms =  validRooms.filter((r) => r.status === "IN_GAME");

  const validPlayingRooms = [];
  for (const r of playingRooms) {
    const players = await getPlayers(r.roomId);
    if (players.some((p) => p.userId === userId)) {
      validPlayingRooms.push(r);
    }
  }
    return { waitingRooms, playingRooms: validPlayingRooms };

}
module.exports = {
  createRoom,
  getRoom,
  getPlayers,
  addPlayer,
  removePlayer,
  deleteRoom,
  getAllRooms
};
const { z } = require("zod");

const createRoomSchema = z.object({
    roomId: z.string().min(3).max(32).optional
});


const joinRoomSchema = z.object({
  roomId: z.string().min(3).max(32),
});

module.exports = { createRoomSchema, joinRoomSchema };
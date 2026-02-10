const { z } = require("zod");

const gameStartSchema = z.object({
  roomId: z.string().min(3).max(32).optional(),
});

const gameClickSchema = z.object({
  roomId: z.string().min(3).max(32).optional(),
});

module.exports = { gameStartSchema, gameClickSchema };

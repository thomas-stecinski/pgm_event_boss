const { z } = require("zod");

const gameStartSchema = z.object({
  roomId: z.string().min(3).max(32).optional(),
  durationSec: z.number().int().min(10).max(300).optional(), 
});

const gameClickSchema = z.object({
  roomId: z.string().min(3).max(32).optional(),
});

module.exports = { gameStartSchema, gameClickSchema };

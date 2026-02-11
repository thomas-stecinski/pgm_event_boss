const { z } = require("zod");

const gameStartSchema = z.object({
  roomId: z.string().min(3).max(32).optional(),
});

const gameClickSchema = z.object({
  roomId: z.string().min(3).max(32).optional(),
});

const gameChoosePowerSchema = z.object({
  roomId: z.string().min(3).max(32).optional(),
  powerId: z.enum([
    "double_impact",
    "rafale_instable",
    "bombe",
    "retardement",
    "chance_critique",
    "furie_cyclique",
  ]),
});

module.exports = { gameStartSchema, gameClickSchema, gameChoosePowerSchema };

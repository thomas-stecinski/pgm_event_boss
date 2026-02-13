const express = require("express");
const { z } = require("zod");
const { nanoid } = require("nanoid");
const { signToken } = require("./token");
const { redis } = require("../../redis/client");

const authHttpRouter = express.Router();

const PSEUDO_PREFIX = "pseudo:";

// Pseudo unique

async function reservePseudo(name, browserId) {
  const key = PSEUDO_PREFIX + name.toLowerCase();
  const existing = await redis.get(key);
  if (existing && existing !== browserId) {
    return false; // pseudo déjà utilisé par un autre navigateur
  }
  await redis.set(key, browserId, "EX", 2592000); // 30 jours
  return true;
}

authHttpRouter.post("/token", async (req, res) => {
  const schema = z.object({
    userId: z.string().min(1).optional(),
    browserId: z.string().min(1),
    name: z.string().min(1),
  });

  const body = schema.parse(req.body);
  const userId = body.userId || nanoid(10);

  // Vérifier que le pseudo n'est pas déjà pris par un autre navigateur
  const ok = await reservePseudo(body.name, body.browserId);
  if (!ok) {
    return res.status(409).json({ error: "PSEUDO_TAKEN" });
  }

  const token = signToken({ userId, name: body.name });
  res.json({ token, userId, name: body.name });
});

module.exports = { authHttpRouter };

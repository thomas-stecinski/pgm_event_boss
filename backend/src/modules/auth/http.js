const express = require("express");
const { z } = require("zod");
const { nanoid } = require("nanoid");
const { signToken } = require("./token");
const { reservePseudo } = require("../rooms/redis");

const authHttpRouter = express.Router();

authHttpRouter.post("/token", async (req, res) => {
  const schema = z.object({
    userId: z.string().min(1).optional(),
    name: z.string().min(1),
  });

  const body = schema.parse(req.body);
  const userId = body.userId || nanoid(10);

  // Vérifier que le pseudo n'est pas déjà pris par un autre navigateur
  const ok = await reservePseudo(body.name, userId);
  if (!ok) {
    return res.status(409).json({ error: "PSEUDO_TAKEN" });
  }

  const token = signToken({ userId, name: body.name });
  res.json({ token, userId, name: body.name });
});

module.exports = { authHttpRouter };

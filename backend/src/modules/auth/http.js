const express = require("express");
const { z } = require("zod");
const { signToken } = require("./token");

const authHttpRouter = express.Router();

authHttpRouter.post("/token", (req, res) => {
  const schema = z.object({
    userId: z.string().min(1).optional(),
    name: z.string().min(1),
  });

  // Si userId n'existe pas, on en génere un
  const body = schema.parse(req.body);
  const userId = body.userId || nanoid(10);

  const token = signToken({ userId, name: body.name });
  res.json({ token, userId, name: body.name });
});

module.exports = { authHttpRouter };

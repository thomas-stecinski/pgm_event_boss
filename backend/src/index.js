require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const { env } = require("./config/env");
const { createSocketServer } = require("./socket");
const { authHttpRouter } = require("./modules/auth/http");

const app = express();
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

app.get("/health", (_, res) => res.json({ ok: true }));
app.use("/auth", authHttpRouter);

const server = http.createServer(app);
createSocketServer(server);

server.listen(env.PORT, () => {
  console.log(`[api] listening on http://localhost:${env.PORT}`);
});

const Redis = require("ioredis");
const { env } = require("../config/env");

const redis= new Redis(env.REDIS_URL);

redis.on("Connect", () => console.log("[redis] connected"));
redis.on("Error", (e) => console.error("[redis] error", e))

module.exports = { redis };
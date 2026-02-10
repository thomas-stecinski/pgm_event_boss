const Redis = require("ioredis");
const { env } = require("../config/env");

const redis= new Redis(env.REDIS_URL);

redis.on("connect", () => console.log("[redis] connected"));
redis.on("error", (e) => console.error("[redis] error", e))

module.exports = { redis };
function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

const env = {
  PORT: Number(process.env.PORT || 3001),
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
  REDIS_URL: required("REDIS_URL"),
  JWT_SECRET: required("JWT_SECRET"),
};

module.exports = { env };
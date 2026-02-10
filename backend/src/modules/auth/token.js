const jwt = require("jsonwebtoken");
const { env } = require("../../config/env");

function signToken({ userId, name }) {
  return jwt.sign({ userId, name }, env.JWT_SECRET, { expiresIn: "2h" });
}

function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

// Verifie token
function socketAuthMiddleware(socket, next) {
  try {
    // Envoyé dans auth.token
    const token = socket.handshake?.auth?.token;
    if (!token) return next(new Error("Auth token missing"));

    const payload = verifyToken(token);
    socket.user = { userId: payload.userId, name: payload.name };
    return next();
  } catch (e) {
    return next(new Error("Invalid token"));
  }
}

module.exports = { signToken, verifyToken, socketAuthMiddleware };

const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const env = require("../config/env");

function signAccessToken(payload) {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.secret);
}

function generateRefreshToken() {
  return crypto.randomBytes(64).toString("hex");
}

function getRefreshTokenExpiry() {
  return new Date(Date.now() + env.jwt.refreshExpiresInMs);
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
};
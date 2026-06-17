const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const env = require("../config/env");

function signAccessToken(payload) {
  return jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn || "15m",
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.secret);
}

function generateRefreshToken() {
  return crypto.randomBytes(64).toString("hex");
}

function parseExpiresInToMs(value) {
  if (!value) return 7 * 24 * 60 * 60 * 1000;

  const match = String(value).trim().match(/^(\d+)(ms|s|m|h|d)$/i);

  if (!match) return 7 * 24 * 60 * 60 * 1000;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  const multipliers = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
}

function getRefreshTokenExpiry() {
  const expiresIn =
    env.jwt.refreshExpiresIn ||
    env.jwt_refresh_expires_in ||
    "7d";

  return new Date(Date.now() + parseExpiresInToMs(expiresIn));
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
};
// src/middlewares/authMiddleware.js
const { verifyAccessToken } = require("../utils/jwt");
const AppError = require("../utils/AppError");
const MSG = require("../constants/messages");
const HTTP = require("../constants/httpStatus");

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];
  if (!token) return next(new AppError(MSG.AUTH.TOKEN_REQUIRED, HTTP.UNAUTHORIZED, "NO_TOKEN"));
  try {
    req.user = verifyAccessToken(token); // { id, email, name }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authenticateToken;
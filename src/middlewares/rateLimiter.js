// src/middlewares/rateLimiter.js
const rateLimit = require("express-rate-limit");
const MSG = require("../constants/messages");
const HTTP = require("../constants/httpStatus");

// ── Global: todas as rotas ─────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "error", message: MSG.GENERIC.RATE_LIMIT },
  skip: (req) => req.path === "/health",
});

// ── Auth: login e registro ─────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(HTTP.TOO_MANY_REQUESTS).json({
      status: "error",
      code: "AUTH_RATE_LIMIT",
      message: MSG.GENERIC.AUTH_LIMIT,
    });
  },
});

// ── IA: limitar chamadas à Gemini (custo!) ─────────────────────
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10,             // máximo 10 mensagens por minuto por usuário
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip, // por usuário, não por IP
  handler: (req, res) => {
    res.status(HTTP.TOO_MANY_REQUESTS).json({
      status: "error",
      code: "AI_RATE_LIMIT",
      message: "Muitas mensagens em pouco tempo. Aguarde um momento antes de continuar.",
    });
  },
});

// ── Notificações: evitar abuso de token push ───────────────────
const notificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20,                   // 20 registros de token por hora
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => {
    res.status(HTTP.TOO_MANY_REQUESTS).json({
      status: "error",
      code: "NOTIFICATION_RATE_LIMIT",
      message: "Muitas requisições de notificação. Tente novamente mais tarde.",
    });
  },
});

module.exports = { globalLimiter, authLimiter, aiLimiter, notificationLimiter };
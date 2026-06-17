// app.js — ATUALIZADO
// Adicionado: notificationRoutes, incomeRoutes, profileRoutes
// Corrigido: ordem dos handlers, caminho das rotas

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const env = require("./src/config/env");
const logger = require("./src/utils/logger");

const { globalLimiter, authLimiter } = require("./src/middlewares/rateLimiter");
const errorHandler = require("./src/middlewares/errorHandler");

const AppError = require("./src/utils/AppError");
const HTTP = require("./src/constants/httpStatus");

// Rotas
const authRoutes         = require("./src/routes/authRoutes");
const transactionRoutes  = require("./src/routes/transactionRoutes");
const verificationRoutes = require("./src/routes/VerificationRoutes");
const aiRoutes           = require("./src/routes/aiRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");
const incomeRoutes       = require("./src/routes/incomeRoutes");
const profileRoutes      = require("./src/routes/profileRoutes");

const app = express();

// ── Segurança base ─────────────────────────────────────────────
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet());

// ── CORS ───────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:3001",
  "http://localhost:8081",   // Expo Metro Bundler
  "http://localhost:19006",  // Expo Web
  env.allowed_origin,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite sem origin (apps mobile nativos e Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Body Parser ────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));

// ── Logger HTTP ────────────────────────────────────────────────
if (env.node_env !== "test") {
  app.use(
    morgan(env.node_env === "production" ? "combined" : "dev", {
      stream: { write: (msg) => logger.http(msg.trim()) },
    })
  );
}

// ── Rate Limiter global ────────────────────────────────────────
app.use(globalLimiter);

// ── Health Check ───────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(HTTP.OK).json({
    status: "ok",
    version: "2.1.0",
    env: env.node_env,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  res.status(HTTP.OK).json({
    status: "ok",
    message: "MindMoney API v2.1",
  });
});

// ── Rotas ──────────────────────────────────────────────────────
app.use("/auth",          authLimiter, authRoutes);
app.use("/transactions",  transactionRoutes);
app.use("/incomes",       incomeRoutes);
app.use("/profile",       profileRoutes);
app.use("/verify",        verificationRoutes);
app.use("/ai",            aiRoutes);
app.use("/notifications", notificationRoutes);

// ── JSON Inválido ──────────────────────────────────────────────
// IMPORTANTE: deve vir ANTES do errorHandler geral
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(HTTP.BAD_REQUEST).json({
      status: "error",
      message: "JSON inválido no corpo da requisição",
    });
  }
  next(err);
});

// ── 404 ────────────────────────────────────────────────────────
app.use((req, res, next) => {
  next(
    new AppError(
      `Rota ${req.method} ${req.path} não encontrada`,
      HTTP.NOT_FOUND,
      "NOT_FOUND"
    )
  );
});

// ── Error Handler global ───────────────────────────────────────
app.use(errorHandler);

module.exports = app;
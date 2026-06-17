// src/controllers/notificationController.js

const notificationService = require("../services/notificationService");
const catchAsync = require("../utils/catchAsync");
const HTTP = require("../constants/httpStatus");

// ── POST /notifications/token ─────────────────────────────────
const registerToken = catchAsync(async (req, res) => {
  const { token, platform } = req.body;

  if (!token) {
    return res.status(HTTP.BAD_REQUEST).json({
      status: "error",
      message: "Token obrigatório",
    });
  }

  const result = await notificationService.registerToken(
    req.user.id,
    token,
    platform || "android"
  );

  res.status(HTTP.OK).json({ status: "success", ...result });
});

// ── DELETE /notifications/token ───────────────────────────────
const removeToken = catchAsync(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(HTTP.BAD_REQUEST).json({
      status: "error",
      message: "Token obrigatório",
    });
  }

  const result = await notificationService.removeToken(req.user.id, token);
  res.status(HTTP.OK).json({ status: "success", ...result });
});

// ── GET /notifications ────────────────────────────────────────
const list = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);

  const result = await notificationService.listNotifications(req.user.id, page, limit);
  res.status(HTTP.OK).json({ status: "success", ...result });
});

// ── PATCH /notifications/:id/read ─────────────────────────────
const markAsRead = catchAsync(async (req, res) => {
  const result = await notificationService.markAsRead(req.user.id, req.params.id);
  res.status(HTTP.OK).json({ status: "success", ...result });
});

// ── PATCH /notifications/read-all ─────────────────────────────
const markAllAsRead = catchAsync(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user.id);
  res.status(HTTP.OK).json({ status: "success", ...result });
});

// ── POST /notifications/test (apenas em development) ──────────
const sendTest = catchAsync(async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(HTTP.FORBIDDEN).json({
      status: "error",
      message: "Rota disponível apenas em development",
    });
  }

  const result = await notificationService.notifyUser(req.user.id, {
    title: "🧪 Notificação de Teste",
    body: "Se você está vendo isso, as notificações estão funcionando!",
    data: { type: "test" },
  });

  res.status(HTTP.OK).json({ status: "success", ...result });
});

module.exports = { registerToken, removeToken, list, markAsRead, markAllAsRead, sendTest };
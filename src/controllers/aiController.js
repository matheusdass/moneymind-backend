// src/controllers/aiController.js
// ============================================================
// Controller de IA — apenas orquestra, toda lógica no service
// ============================================================

const aiService = require("../services/aiService");
const catchAsync = require("../utils/catchAsync");
const HTTP = require("../constants/httpStatus");

// ── GET /ai/greeting ──────────────────────────────────────────
const greeting = catchAsync(async (req, res) => {
  const message = await aiService.getGreeting(req.user.id);

  res.status(HTTP.OK).json({
    status: "success",
    message,
  });
});

// ── POST /ai/chat ─────────────────────────────────────────────
// Não executa ações automaticamente.
// Se a IA detectar um comando (ex: criar transação), retorna
// o objeto `action` para o frontend mostrar confirmação ao usuário.
// A execução acontece apenas via POST /ai/actions/confirm.
const sendMessage = catchAsync(async (req, res) => {
  const { message, conversationId } = req.body;

  if (!message?.trim()) {
    return res.status(HTTP.BAD_REQUEST).json({
      status: "error",
      message: "Mensagem obrigatória",
    });
  }

  const result = await aiService.chat(req.user.id, message, conversationId || null);

  res.status(HTTP.OK).json({
    status: "success",
    reply: result.reply,
    conversationId: result.conversationId,
    action: result.action || null,
  });
});

// ── GET /ai/conversations ─────────────────────────────────────
const listConversations = catchAsync(async (req, res) => {
  const conversations = await aiService.listConversations(req.user.id);

  res.status(HTTP.OK).json({
    status: "success",
    data: conversations,
  });
});

// ── GET /ai/conversations/:id ─────────────────────────────────
const getConversation = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await aiService.getMessages(id, req.user.id);

  res.status(HTTP.OK).json({
    status: "success",
    data: result,
  });
});

// ── DELETE /ai/conversations/:id ──────────────────────────────
const deleteConversation = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await aiService.deleteConversation(id, req.user.id);

  res.status(HTTP.OK).json({
    status: "success",
    ...result,
  });
});

// ── POST /ai/conversations ────────────────────────────────────
const createConversation = catchAsync(async (req, res) => {
  const { title } = req.body;
  const conversation = await aiService.createConversation(req.user.id, title || null);

  res.status(HTTP.CREATED).json({
    status: "success",
    data: conversation,
  });
});

module.exports = {
  greeting,
  sendMessage,
  listConversations,
  getConversation,
  deleteConversation,
  createConversation,
};
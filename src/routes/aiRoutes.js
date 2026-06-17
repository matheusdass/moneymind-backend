// src/routes/aiRoutes.js
const { Router } = require("express");
const {
  greeting,
  sendMessage,
  listConversations,
  getConversation,
  deleteConversation,
  createConversation,
} = require("../controllers/aiController");
const auth = require("../middlewares/authMiddleware");
const { aiLimiter } = require("../middlewares/rateLimiter");

const router = Router();

// Todas as rotas de IA requerem autenticação
router.use(auth);

// Saudação ao abrir o app
router.get("/greeting", greeting);

// Chat principal (com rate limit específico para IA)
router.post("/chat", aiLimiter, sendMessage);

// Gerenciar conversas
router.get("/conversations",     listConversations);
router.post("/conversations",    createConversation);
router.get("/conversations/:id", getConversation);
router.delete("/conversations/:id", deleteConversation);

module.exports = router;
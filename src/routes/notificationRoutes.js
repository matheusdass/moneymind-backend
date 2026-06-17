// src/routes/notificationRoutes.js
const { Router } = require("express");
const ctrl = require("../controllers/notificationController");
const auth = require("../middlewares/authMiddleware");
const { notificationLimiter } = require("../middlewares/rateLimiter");

const router = Router();

router.use(auth);

// Token push
router.post("/token",   notificationLimiter, ctrl.registerToken);
router.delete("/token", ctrl.removeToken);

// Notificações in-app
router.get("/",               ctrl.list);
router.patch("/read-all",     ctrl.markAllAsRead);
router.patch("/:id/read",     ctrl.markAsRead);

// Teste (só em development)
router.post("/test", notificationLimiter, ctrl.sendTest);

module.exports = router;
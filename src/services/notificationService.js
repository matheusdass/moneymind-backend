// src/services/notificationService.js
// ============================================================
// Serviço de Notificações Push — Expo Push Notifications
// Compatível com React Native/Expo sem precisar de Firebase
// ============================================================

const pool = require("../config/db");
const logger = require("../utils/logger");
const AppError = require("../utils/AppError");
const HTTP = require("../constants/httpStatus");

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// ── Validar formato de token Expo ──────────────────────────────
function isValidExpoToken(token) {
  return (
    typeof token === "string" &&
    (token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken["))
  );
}

// ── Registrar token push do usuário ───────────────────────────
async function registerToken(userId, token, platform = "android") {
  if (!isValidExpoToken(token)) {
    throw new AppError(
      "Token de push inválido. Use o token gerado pelo Expo no app.",
      HTTP.BAD_REQUEST,
      "INVALID_PUSH_TOKEN"
    );
  }

  // Verifica se o token já existe para outro usuário (segurança)
  const [[existing]] = await pool.query(
    `SELECT BIN_TO_UUID(user_id) AS user_id
     FROM push_notification_tokens
     WHERE token = ?`,
    [token]
  );

  if (existing && existing.user_id !== userId) {
    // Token já pertence a outro usuário — reatribuir (troca de dispositivo)
    await pool.query(
      "UPDATE push_notification_tokens SET user_id = UUID_TO_BIN(?), active = 1 WHERE token = ?",
      [userId, token]
    );
    return { message: "Token de notificação atualizado com sucesso" };
  }

  // Insert ou atualiza se já existia para este usuário
  await pool.query(
    `INSERT INTO push_notification_tokens (id, user_id, token, platform, active)
     VALUES (UUID_TO_BIN(UUID()), UUID_TO_BIN(?), ?, ?, 1)
     ON DUPLICATE KEY UPDATE active = 1, platform = VALUES(platform), updated_at = NOW()`,
    [userId, token, platform]
  );

  return { message: "Token de notificação registrado com sucesso" };
}

// ── Remover/desativar token ────────────────────────────────────
async function removeToken(userId, token) {
  const [result] = await pool.query(
    `UPDATE push_notification_tokens
     SET active = 0
     WHERE user_id = UUID_TO_BIN(?) AND token = ?`,
    [userId, token]
  );

  if (result.affectedRows === 0) {
    throw new AppError("Token não encontrado", HTTP.NOT_FOUND, "TOKEN_NOT_FOUND");
  }

  return { message: "Token removido com sucesso" };
}

// ── Buscar tokens ativos de um usuário ────────────────────────
async function getUserTokens(userId) {
  const [rows] = await pool.query(
    `SELECT token, platform
     FROM push_notification_tokens
     WHERE user_id = UUID_TO_BIN(?) AND active = 1`,
    [userId]
  );
  return rows.map((r) => r.token);
}

// ── Enviar notificação para tokens específicos ─────────────────
async function sendPushNotification(tokens, { title, body, data = {} }) {
  if (!tokens || tokens.length === 0) {
    logger.info("Nenhum token para enviar notificação");
    return { sent: 0, failed: 0 };
  }

  // Filtra apenas tokens Expo válidos
  const validTokens = tokens.filter(isValidExpoToken);

  if (validTokens.length === 0) {
    logger.warn("Nenhum token Expo válido encontrado");
    return { sent: 0, failed: 0 };
  }

  // Monta payload para Expo
  const messages = validTokens.map((token) => ({
    to: token,
    sound: "default",
    title,
    body,
    data,
    channelId: "default",
  }));

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();

    // Processar respostas — desativar tokens inválidos
    let sent = 0;
    let failed = 0;

    if (result.data) {
      for (let i = 0; i < result.data.length; i++) {
        const ticket = result.data[i];
        if (ticket.status === "ok") {
          sent++;
        } else {
          failed++;
          const failedToken = validTokens[i];

          // Token inválido/expirado — desativar no banco
          if (ticket.details?.error === "DeviceNotRegistered") {
            logger.warn(`Token inválido detectado, desativando: ${failedToken.substring(0, 30)}...`);
            await pool.query(
              "UPDATE push_notification_tokens SET active = 0 WHERE token = ?",
              [failedToken]
            );
          }

          logger.error(`Falha ao enviar para token: ${ticket.message || "erro desconhecido"}`);
        }
      }
    }

    logger.info(`Push enviado: ${sent} ok, ${failed} falhas`);
    return { sent, failed };

  } catch (err) {
    logger.error("Erro ao chamar API do Expo:", err.message);
    throw new AppError(
      "Falha ao enviar notificação",
      HTTP.SERVICE_UNAVAILABLE,
      "PUSH_SEND_FAILED"
    );
  }
}

// ── Enviar notificação para um usuário específico ──────────────
async function notifyUser(userId, { title, body, data = {} }) {
  const tokens = await getUserTokens(userId);

  if (tokens.length === 0) {
    logger.info(`Usuário ${userId} sem tokens de push ativos`);
    return { sent: 0, failed: 0, message: "Usuário sem dispositivo registrado" };
  }

  // Salvar na tabela notifications do banco (histórico in-app)
  await pool.query(
    `INSERT INTO notifications (id, user_id, title, message, type, channel)
     VALUES (UUID_TO_BIN(UUID()), UUID_TO_BIN(?), ?, ?, 'alert', 'push')`,
    [userId, title, body]
  );

  return sendPushNotification(tokens, { title, body, data });
}

// ── Lembrete financeiro diário ─────────────────────────────────
async function sendDailySummary(userId) {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const [[summary]] = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expenses,
        COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE -amount END), 0) AS balance
       FROM transactions
       WHERE user_id = UUID_TO_BIN(?)
         AND MONTH(transaction_date) = ? AND YEAR(transaction_date) = ?`,
      [userId, month, year]
    );

    const balance = Number(summary?.balance || 0);
    const expenses = Number(summary?.total_expenses || 0);

    const title = "📊 Resumo Financeiro do Dia";
    const body = `Despesas: R$ ${expenses.toFixed(2)} | Saldo: R$ ${balance.toFixed(2)}`;

    return notifyUser(userId, { title, body, data: { type: "daily_summary" } });
  } catch (err) {
    logger.error(`Erro ao enviar resumo diário para ${userId}:`, err.message);
  }
}

// ── Alerta de gasto alto ───────────────────────────────────────
async function sendHighSpendingAlert(userId, amount, category) {
  const title = "⚠️ Gasto alto detectado";
  const body = `Você gastou R$ ${Number(amount).toFixed(2)} em ${category}`;

  return notifyUser(userId, {
    title,
    body,
    data: { type: "high_spending", amount, category },
  });
}

// ── Listar notificações do usuário (in-app) ────────────────────
async function listNotifications(userId, page = 1, limit = 20) {
  const offset = (page - 1) * limit;

  const [[{ total }]] = await pool.query(
    "SELECT COUNT(*) AS total FROM notifications WHERE user_id = UUID_TO_BIN(?) AND deleted_at IS NULL",
    [userId]
  );

  const [rows] = await pool.query(
    `SELECT BIN_TO_UUID(id) AS id, title, message, type, channel, read_at, created_at
     FROM notifications
     WHERE user_id = UUID_TO_BIN(?) AND deleted_at IS NULL
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );

  return {
    data: rows,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    unread: rows.filter((n) => !n.read_at).length,
  };
}

// ── Marcar notificação como lida ──────────────────────────────
async function markAsRead(userId, notificationId) {
  const [result] = await pool.query(
    `UPDATE notifications
     SET read_at = NOW()
     WHERE id = UUID_TO_BIN(?) AND user_id = UUID_TO_BIN(?) AND read_at IS NULL`,
    [notificationId, userId]
  );

  if (result.affectedRows === 0) {
    throw new AppError("Notificação não encontrada ou já lida", HTTP.NOT_FOUND);
  }

  return { message: "Notificação marcada como lida" };
}

// ── Marcar todas como lidas ────────────────────────────────────
async function markAllAsRead(userId) {
  await pool.query(
    "UPDATE notifications SET read_at = NOW() WHERE user_id = UUID_TO_BIN(?) AND read_at IS NULL",
    [userId]
  );

  return { message: "Todas as notificações marcadas como lidas" };
}

module.exports = {
  registerToken,
  removeToken,
  getUserTokens,
  sendPushNotification,
  notifyUser,
  sendDailySummary,
  sendHighSpendingAlert,
  listNotifications,
  markAsRead,
  markAllAsRead,
};
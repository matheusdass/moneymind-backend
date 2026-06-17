const pool = require("../config/db");

async function saveRefreshToken({ userId, token, expiresAt, ipAddress }) {
  await pool.query(
    `INSERT INTO refresh_tokens (id, user_id, token, expires_at, ip_address)
     VALUES (UUID_TO_BIN(UUID()), UUID_TO_BIN(?), ?, ?, ?)`,
    [userId, token, expiresAt, ipAddress || null]
  );
}

async function findRefreshToken(token) {
  const [[row]] = await pool.query(
    `SELECT 
        BIN_TO_UUID(rt.id) AS id,
        BIN_TO_UUID(rt.user_id) AS user_id,
        u.username,
        u.email
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token = ?
       AND rt.revoked = 0
       AND rt.expires_at > NOW()`,
    [token]
  );

  return row || null;
}

async function revokeToken(id) {
  await pool.query(
    "UPDATE refresh_tokens SET revoked = 1 WHERE id = UUID_TO_BIN(?)",
    [id]
  );
}

async function revokeTokenByValue(token) {
  await pool.query(
    "UPDATE refresh_tokens SET revoked = 1 WHERE token = ?",
    [token]
  );
}

async function revokeAllUserTokens(userId) {
  await pool.query(
    "UPDATE refresh_tokens SET revoked = 1 WHERE user_id = UUID_TO_BIN(?)",
    [userId]
  );
}

module.exports = {
  saveRefreshToken,
  findRefreshToken,
  revokeToken,
  revokeTokenByValue,
  revokeAllUserTokens,
};
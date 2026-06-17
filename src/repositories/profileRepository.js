const pool = require("../config/db");

async function getStats(userId) {
  const [[stats]] = await pool.query(
    `SELECT
      COUNT(*) AS total_transactions,
      COUNT(CASE WHEN type = 'income'  THEN 1 END) AS total_incomes,
      COUNT(CASE WHEN type = 'expense' THEN 1 END) AS total_expenses,
      COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS total_received,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_spent,
      COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE -amount END), 0) AS overall_balance
     FROM transactions
     WHERE user_id = UUID_TO_BIN(?)`,
    [userId]
  );
  return stats;
}

module.exports = { getStats };
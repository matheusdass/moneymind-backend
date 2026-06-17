const pool = require("../config/db");

async function findAll(userId, filters = {}) {
  const {
    page = 1, limit = 20,
    category, start_date, end_date, search,
    sort = "date", order = "DESC",
  } = filters;

  const safePage  = Math.max(1, parseInt(page));
  const safeLimit = Math.min(100, parseInt(limit));
  const offset    = (safePage - 1) * safeLimit;

  const ALLOWED_SORT  = ["date", "amount", "category", "created_at", "description"];
  const ALLOWED_ORDER = ["ASC", "DESC"];
  const safeSort  = ALLOWED_SORT.includes(sort) ? sort : "date";
  const safeOrder = ALLOWED_ORDER.includes(order.toUpperCase()) ? order.toUpperCase() : "DESC";

  let where = "WHERE user_id = ?";
  const params = [userId];

  if (category)   { where += " AND category = ?";       params.push(category); }
  if (start_date) { where += " AND date >= ?";          params.push(start_date); }
  if (end_date)   { where += " AND date <= ?";          params.push(end_date); }
  if (search)     { where += " AND description LIKE ?"; params.push(`%${search}%`); }

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM incomes ${where}`,
    params
  );

  const [rows] = await pool.query(
    `SELECT * FROM incomes ${where} ORDER BY ${safeSort} ${safeOrder} LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset]
  );

  return { rows, total, page: safePage, limit: safeLimit };
}

async function findById(id, userId) {
  const [[row]] = await pool.query(
    "SELECT * FROM incomes WHERE id = ? AND user_id = ?",
    [id, userId]
  );
  return row || null;
}

async function create({ userId, description, amount, category, date, notes }) {
  const [result] = await pool.query(
    `INSERT INTO incomes (user_id, description, amount, category, date, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [userId, description, amount, category, date, notes || null]
  );
  const [[row]] = await pool.query("SELECT * FROM incomes WHERE id = ?", [result.insertId]);
  return row;
}

async function update(id, userId, fields) {
  const ALLOWED = ["description", "amount", "category", "date", "notes"];
  const sets = [];
  const vals = [];

  ALLOWED.forEach((f) => {
    if (fields[f] !== undefined) {
      sets.push(`${f} = ?`);
      vals.push(f === "amount" ? parseFloat(fields[f]) : fields[f]);
    }
  });

  if (sets.length === 0) return null;

  sets.push("updated_at = NOW()");
  vals.push(id, userId);

  await pool.query(
    `UPDATE incomes SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
    vals
  );

  const [[row]] = await pool.query("SELECT * FROM incomes WHERE id = ?", [id]);
  return row;
}

async function remove(id, userId) {
  const [result] = await pool.query(
    "DELETE FROM incomes WHERE id = ? AND user_id = ?",
    [id, userId]
  );
  return result.affectedRows > 0;
}

async function getSummary(userId, month, year) {
  const [[summary]] = await pool.query(
    `SELECT
      COALESCE(SUM(amount), 0) AS total,
      COUNT(*)                 AS count,
      MAX(amount)              AS highest,
      AVG(amount)              AS average
     FROM incomes
     WHERE user_id = ? AND MONTH(date) = ? AND YEAR(date) = ?`,
    [userId, month, year]
  );

  const [byCategory] = await pool.query(
    `SELECT category, SUM(amount) AS total, COUNT(*) AS count,
            ROUND(SUM(amount) * 100.0 / NULLIF(SUM(SUM(amount)) OVER (), 0), 1) AS percentage
     FROM incomes
     WHERE user_id = ? AND MONTH(date) = ? AND YEAR(date) = ?
     GROUP BY category ORDER BY total DESC`,
    [userId, month, year]
  );

  return { summary, by_category: byCategory };
}

async function getEvolution(userId, months = 6) {
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(date, '%Y-%m') AS month, SUM(amount) AS total, COUNT(*) AS count
     FROM incomes
     WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
     GROUP BY DATE_FORMAT(date, '%Y-%m')
     ORDER BY month ASC`,
    [userId, months]
  );
  return rows;
}

async function exportAll(userId, filters = {}) {
  const { start_date, end_date } = filters;
  let where = "WHERE user_id = ?";
  const params = [userId];
  if (start_date) { where += " AND date >= ?"; params.push(start_date); }
  if (end_date)   { where += " AND date <= ?"; params.push(end_date); }

  const [rows] = await pool.query(
    `SELECT description, amount, category, date, notes FROM incomes ${where} ORDER BY date DESC`,
    params
  );
  return rows;
}

module.exports = { findAll, findById, create, update, remove, getSummary, getEvolution, exportAll };
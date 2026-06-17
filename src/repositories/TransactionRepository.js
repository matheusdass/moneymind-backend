const pool = require("../config/db");

// ── Categories ─────────────────────────────────────────────────
async function findCategories(userId, type = null) {
  let query = `SELECT BIN_TO_UUID(id) AS id, name, type
               FROM categories WHERE user_id = UUID_TO_BIN(?)`;
  const params = [userId];
  if (type) { query += " AND type = ?"; params.push(type); }
  query += " ORDER BY name ASC";
  const [rows] = await pool.query(query, params);
  return rows;
}

async function findCategoryById(id, userId) {
  const [[row]] = await pool.query(
    `SELECT BIN_TO_UUID(id) AS id, name, type
     FROM categories WHERE id = UUID_TO_BIN(?) AND user_id = UUID_TO_BIN(?)`,
    [id, userId]
  );
  return row || null;
}

async function createCategory({ userId, name, type }) {
  await pool.query(
    `INSERT INTO categories (id, name, type, user_id)
     VALUES (UUID_TO_BIN(UUID()), ?, ?, UUID_TO_BIN(?))`,
    [name, type, userId]
  );
  const [[row]] = await pool.query(
    `SELECT BIN_TO_UUID(id) AS id, name, type
     FROM categories WHERE user_id = UUID_TO_BIN(?) AND name = ? AND type = ?`,
    [userId, name, type]
  );
  return row;
}

async function deleteCategory(id, userId) {
  const [result] = await pool.query(
    "DELETE FROM categories WHERE id = UUID_TO_BIN(?) AND user_id = UUID_TO_BIN(?)",
    [id, userId]
  );
  return result.affectedRows > 0;
}

// ── Transactions ───────────────────────────────────────────────
async function findAll(userId, filters = {}) {
  const {
    page = 1, limit = 20,
    type, category_id, start_date, end_date, search,
    sort = "transaction_date", order = "DESC",
  } = filters;

  const safePage  = Math.max(1, parseInt(page));
  const safeLimit = Math.min(100, parseInt(limit));
  const offset    = (safePage - 1) * safeLimit;

  const ALLOWED_SORT = ["transaction_date", "amount", "description", "created_at"];
  const safeSort  = ALLOWED_SORT.includes(sort) ? `t.${sort}` : "t.transaction_date";
  const safeOrder = order.toUpperCase() === "ASC" ? "ASC" : "DESC";

  let where = "WHERE t.user_id = UUID_TO_BIN(?)";
  const params = [userId];

  if (type)        { where += " AND t.type = ?";                      params.push(type); }
  if (category_id) { where += " AND t.category_id = UUID_TO_BIN(?)"; params.push(category_id); }
  if (start_date)  { where += " AND t.transaction_date >= ?";         params.push(start_date); }
  if (end_date)    { where += " AND t.transaction_date <= ?";         params.push(end_date); }
  if (search)      { where += " AND t.description LIKE ?";            params.push(`%${search}%`); }

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM transactions t ${where}`, params
  );

  const [rows] = await pool.query(
    `SELECT BIN_TO_UUID(t.id) AS id, t.amount, t.transaction_date,
            t.type, t.description, BIN_TO_UUID(t.category_id) AS category_id,
            c.name AS category_name
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     ${where} ORDER BY ${safeSort} ${safeOrder} LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset]
  );

  return { rows, total, page: safePage, limit: safeLimit };
}

async function findById(id, userId) {
  const [[row]] = await pool.query(
    `SELECT BIN_TO_UUID(t.id) AS id, t.amount, t.transaction_date,
            t.type, t.description, BIN_TO_UUID(t.category_id) AS category_id,
            c.name AS category_name
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.id = UUID_TO_BIN(?) AND t.user_id = UUID_TO_BIN(?)`,
    [id, userId]
  );
  return row || null;
}

async function create({ userId, amount, transaction_date, type, description, category_id }) {
  await pool.query(
    `INSERT INTO transactions (id, amount, transaction_date, type, description, user_id, category_id)
     VALUES (UUID_TO_BIN(UUID()), ?, ?, ?, ?, UUID_TO_BIN(?), UUID_TO_BIN(?))`,
    [amount, transaction_date, type, description || null, userId, category_id]
  );
  const [[row]] = await pool.query(
    `SELECT BIN_TO_UUID(t.id) AS id, t.amount, t.transaction_date,
            t.type, t.description, c.name AS category_name
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = UUID_TO_BIN(?)
     ORDER BY t.transaction_date DESC LIMIT 1`,
    [userId]
  );
  return row;
}

async function update(id, userId, fields) {
  const ALLOWED = ["amount", "transaction_date", "description"];
  const sets = [], vals = [];

  ALLOWED.forEach(f => {
    if (fields[f] !== undefined) {
      sets.push(`${f} = ?`);
      vals.push(f === "amount" ? parseFloat(fields[f]) : fields[f]);
    }
  });

  if (fields.category_id) {
    sets.push("category_id = UUID_TO_BIN(?)");
    vals.push(fields.category_id);
  }

  if (sets.length === 0) return null;
  vals.push(id, userId);

  await pool.query(
    `UPDATE transactions SET ${sets.join(", ")}
     WHERE id = UUID_TO_BIN(?) AND user_id = UUID_TO_BIN(?)`,
    vals
  );

  return findById(id, userId);
}

async function remove(id, userId) {
  const [result] = await pool.query(
    "DELETE FROM transactions WHERE id = UUID_TO_BIN(?) AND user_id = UUID_TO_BIN(?)",
    [id, userId]
  );
  return result.affectedRows > 0;
}

// ── Summary / Analytics ────────────────────────────────────────
async function getSummary(userId, month, year) {
  const [[summary]] = await pool.query(
    `SELECT
      COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS total_income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expenses,
      COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE -amount END), 0) AS balance,
      COUNT(*) AS total_transactions,
      COUNT(CASE WHEN type = 'income'  THEN 1 END) AS income_count,
      COUNT(CASE WHEN type = 'expense' THEN 1 END) AS expense_count
     FROM transactions
     WHERE user_id = UUID_TO_BIN(?)
       AND MONTH(transaction_date) = ? AND YEAR(transaction_date) = ?`,
    [userId, month, year]
  );

  const [byCategory] = await pool.query(
    `SELECT c.name AS category, t.type, SUM(t.amount) AS total, COUNT(*) AS count,
            ROUND(SUM(t.amount) * 100.0 /
              NULLIF(SUM(SUM(t.amount)) OVER (PARTITION BY t.type), 0), 1) AS percentage
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = UUID_TO_BIN(?)
       AND MONTH(t.transaction_date) = ? AND YEAR(t.transaction_date) = ?
     GROUP BY c.name, t.type
     ORDER BY total DESC`,
    [userId, month, year]
  );

  return { summary, by_category: byCategory };
}

async function getEvolution(userId, months = 6) {
  const [rows] = await pool.query(
    `SELECT
      DATE_FORMAT(transaction_date, '%Y-%m') AS month,
      SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END) AS income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expenses
     FROM transactions
     WHERE user_id = UUID_TO_BIN(?)
       AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
     GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
     ORDER BY month ASC`,
    [userId, months]
  );
  return rows;
}

async function exportAll(userId, filters = {}) {
  const { type, start_date, end_date } = filters;
  let where = "WHERE t.user_id = UUID_TO_BIN(?)";
  const params = [userId];
  if (type)       { where += " AND t.type = ?";                params.push(type); }
  if (start_date) { where += " AND t.transaction_date >= ?";   params.push(start_date); }
  if (end_date)   { where += " AND t.transaction_date <= ?";   params.push(end_date); }

  const [rows] = await pool.query(
    `SELECT t.description, t.amount, t.type, c.name AS category, t.transaction_date
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     ${where} ORDER BY t.transaction_date DESC`,
    params
  );
  return rows;
}

module.exports = {
  findCategories, findCategoryById, createCategory, deleteCategory,
  findAll, findById, create, update, remove,
  getSummary, getEvolution, exportAll,
};
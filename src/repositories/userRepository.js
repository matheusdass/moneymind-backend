// src/repositories/userRepository.js
// ============================================================
// Repositório de usuários
// ============================================================

const pool = require("../config/db");

// ── Buscar por ID ──────────────────────────────────────────────
async function findById(id) {
  const [[row]] = await pool.query(
    `SELECT BIN_TO_UUID(id) AS id, username, email,
            active, last_login, age_verified, birth_date, face_descriptor,
            created_at, updated_at
     FROM users
     WHERE id = UUID_TO_BIN(?)`,
    [id]
  );

  return row || null;
}

// ── Buscar por email sem senha ─────────────────────────────────
async function findByEmail(email) {
  const [[row]] = await pool.query(
    `SELECT BIN_TO_UUID(id) AS id, username, email
     FROM users
     WHERE email = ?`,
    [email]
  );

  return row || null;
}

// ── Buscar por email COM senha ─────────────────────────────────
async function findByEmailWithPassword(email) {
  const [[row]] = await pool.query(
    `SELECT BIN_TO_UUID(id) AS id, username, email, password
     FROM users
     WHERE email = ?`,
    [email]
  );

  return row || null;
}

// ── Criar usuário ──────────────────────────────────────────────
async function create({ username, email, password }) {
  await pool.query(
    `INSERT INTO users (id, username, email, password)
     VALUES (UUID_TO_BIN(UUID()), ?, ?, ?)`,
    [username, email, password]
  );

  const [[user]] = await pool.query(
    `SELECT BIN_TO_UUID(id) AS id, username, email
     FROM users
     WHERE email = ?`,
    [email]
  );

  return user;
}

// ── Atualizar último login ─────────────────────────────────────
async function updateLastLogin(id) {
  await pool.query(
    "UPDATE users SET last_login = NOW() WHERE id = UUID_TO_BIN(?)",
    [id]
  );
}

// ── Atualizar senha ────────────────────────────────────────────
async function updatePassword(id, password) {
  await pool.query(
    "UPDATE users SET password = ?, updated_at = NOW() WHERE id = UUID_TO_BIN(?)",
    [password, id]
  );
}

// ── Atualizar email ────────────────────────────────────────────
async function updateEmail(id, email) {
  if (!email) return;

  await pool.query(
    "UPDATE users SET email = ?, updated_at = NOW() WHERE id = UUID_TO_BIN(?)",
    [email, id]
  );
}

// ── Atualizar nome / username ──────────────────────────────────
async function updateUsername(id, username) {
  if (!username) return;

  await pool.query(
    "UPDATE users SET username = ?, updated_at = NOW() WHERE id = UUID_TO_BIN(?)",
    [username, id]
  );
}

// ── Atualizar perfil completo ──────────────────────────────────
async function updateProfile(id, { username, email }) {
  const fields = [];
  const values = [];

  if (username) {
    fields.push("username = ?");
    values.push(username);
  }

  if (email) {
    fields.push("email = ?");
    values.push(email);
  }

  if (fields.length === 0) {
    return;
  }

  fields.push("updated_at = NOW()");
  values.push(id);

  await pool.query(
    `UPDATE users SET ${fields.join(", ")} WHERE id = UUID_TO_BIN(?)`,
    values
  );
}

// ── Atualizar verificação de idade ─────────────────────────────
async function updateAgeVerification(id, birthDate) {
  await pool.query(
    `UPDATE users
     SET age_verified = 1, birth_date = ?, updated_at = NOW()
     WHERE id = UUID_TO_BIN(?)`,
    [birthDate, id]
  );
}

// ── Salvar face descriptor ─────────────────────────────────────
async function updateFaceDescriptor(id, descriptor) {
  const jsonDescriptor = JSON.stringify(descriptor);

  await pool.query(
    "UPDATE users SET face_descriptor = ?, updated_at = NOW() WHERE id = UUID_TO_BIN(?)",
    [jsonDescriptor, id]
  );
}

module.exports = {
  findById,
  findByEmail,
  findByEmailWithPassword,
  create,
  updateLastLogin,
  updatePassword,
  updateEmail,
  updateUsername,
  updateProfile,
  updateAgeVerification,
  updateFaceDescriptor,
};
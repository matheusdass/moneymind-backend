const bcrypt = require("bcryptjs");

const userRepo = require("../repositories/userRepository");
const authRepo = require("../repositories/authRepository");

const {
  signAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
} = require("../utils/jwt");

const AppError = require("../utils/AppError");

const MSG = require("../constants/messages");
const HTTP = require("../constants/httpStatus");

// ───────────────────────────────────────────────────────────────
// REGISTER
// ───────────────────────────────────────────────────────────────

async function register({ username, email, password }) {
  if (!username?.trim()) {
    throw new AppError(
      "Username é obrigatório",
      HTTP.BAD_REQUEST,
      "USERNAME_REQUIRED"
    );
  }

  if (!email?.trim()) {
    throw new AppError(
      "Email é obrigatório",
      HTTP.BAD_REQUEST,
      "EMAIL_REQUIRED"
    );
  }

  if (!password || password.length < 6) {
    throw new AppError(
      "Senha deve ter no mínimo 6 caracteres",
      HTTP.BAD_REQUEST,
      "WEAK_PASSWORD"
    );
  }

  const emailTratado = email.trim().toLowerCase();

  const existing = await userRepo.findByEmail(emailTratado);

  if (existing) {
    throw new AppError(
      MSG.AUTH.EMAIL_TAKEN,
      HTTP.CONFLICT,
      "EMAIL_TAKEN"
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await userRepo.create({
    username: username.trim(),
    email: emailTratado,
    password: hashedPassword,
  });

  return {
    message: MSG.AUTH.REGISTER_SUCCESS,
    user,
  };
}

// ───────────────────────────────────────────────────────────────
// LOGIN
// ───────────────────────────────────────────────────────────────

async function login({ email, password }, ipAddress) {
  if (!email?.trim() || !password) {
    throw new AppError(
      "Email e senha são obrigatórios",
      HTTP.BAD_REQUEST,
      "MISSING_CREDENTIALS"
    );
  }

  const emailTratado = email.trim().toLowerCase();

  const user = await userRepo.findByEmailWithPassword(emailTratado);

  if (!user) {
    throw new AppError(
      MSG.AUTH.INVALID_CREDENTIALS,
      HTTP.UNAUTHORIZED,
      "INVALID_CREDENTIALS"
    );
  }

  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    throw new AppError(
      MSG.AUTH.INVALID_CREDENTIALS,
      HTTP.UNAUTHORIZED,
      "INVALID_CREDENTIALS"
    );
  }

  const accessToken = signAccessToken({
    id: user.id,
    email: user.email,
    username: user.username,
  });

  const refreshToken = generateRefreshToken();

  const expiresAt = getRefreshTokenExpiry();

  await authRepo.saveRefreshToken({
    userId: user.id,
    token: refreshToken,
    expiresAt,
    ipAddress,
  });

  await userRepo.updateLastLogin(user.id);

  return {
    message: MSG.AUTH.LOGIN_SUCCESS,

    accessToken,

    refreshToken,

    user: {
      id: user.id,
      username: user.username,
      email: user.email,
    },
  };
}

// ───────────────────────────────────────────────────────────────
// REFRESH
// ───────────────────────────────────────────────────────────────

async function refresh(refreshToken) {
  if (!refreshToken) {
    throw new AppError(
      MSG.AUTH.REFRESH_TOKEN_REQUIRED,
      HTTP.BAD_REQUEST,
      "NO_REFRESH_TOKEN"
    );
  }

  const record = await authRepo.findRefreshToken(refreshToken);

  if (!record) {
    throw new AppError(
      MSG.AUTH.REFRESH_TOKEN_INVALID,
      HTTP.UNAUTHORIZED,
      "INVALID_REFRESH_TOKEN"
    );
  }

  await authRepo.revokeToken(record.id);

  const newAccessToken = signAccessToken({
    id: record.user_id,
    email: record.email,
    username: record.username,
  });

  const newRefreshToken = generateRefreshToken();

  const expiresAt = getRefreshTokenExpiry();

  await authRepo.saveRefreshToken({
    userId: record.user_id,
    token: newRefreshToken,
    expiresAt,
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

// ───────────────────────────────────────────────────────────────
// LOGOUT
// ───────────────────────────────────────────────────────────────

async function logout(refreshToken) {
  if (refreshToken) {
    await authRepo.revokeTokenByValue(refreshToken);
  }
}

// ───────────────────────────────────────────────────────────────
// CHANGE PASSWORD
// ───────────────────────────────────────────────────────────────

async function changePassword(userId, currentPassword, newPassword) {
  const userData = await userRepo.findById(userId);

  if (!userData) {
    throw new AppError(
      "Usuário não encontrado",
      HTTP.BAD_REQUEST,
      "USER_NOT_FOUND"
    );
  }

  const user = await userRepo.findByEmailWithPassword(userData.email);

  if (!user) {
    throw new AppError(
      "Usuário não encontrado",
      HTTP.BAD_REQUEST,
      "USER_NOT_FOUND"
    );
  }

  const match = await bcrypt.compare(currentPassword, user.password);

  if (!match) {
    throw new AppError(
      MSG.AUTH.WRONG_PASSWORD,
      HTTP.UNAUTHORIZED,
      "WRONG_PASSWORD"
    );
  }

  const hashed = await bcrypt.hash(newPassword, 12);

  await userRepo.updatePassword(userId, hashed);

  await authRepo.revokeAllUserTokens(userId);

  return {
    message: MSG.AUTH.PASSWORD_CHANGED,
  };
}

// ───────────────────────────────────────────────────────────────
// RESET PASSWORD
// Versão rápida para teste: verifica se o email existe.
// Depois, em produção, coloca envio real de código por email.
// ───────────────────────────────────────────────────────────────

async function resetPassword(email) {
  if (!email?.trim()) {
    throw new AppError(
      "Email é obrigatório",
      HTTP.BAD_REQUEST,
      "EMAIL_REQUIRED"
    );
  }

  const emailTratado = email.trim().toLowerCase();

  const user = await userRepo.findByEmail(emailTratado);

  if (!user) {
    throw new AppError(
      "Email não encontrado",
      HTTP.BAD_REQUEST,
      "EMAIL_NOT_FOUND"
    );
  }

  return {
    message: "Email encontrado. Agora crie uma nova senha.",
  };
}

// ───────────────────────────────────────────────────────────────
// NEW PASSWORD
// Redefine senha usando email.
// ───────────────────────────────────────────────────────────────

async function newPassword(email, newPlainPassword) {
  if (!email?.trim()) {
    throw new AppError(
      "Email é obrigatório",
      HTTP.BAD_REQUEST,
      "EMAIL_REQUIRED"
    );
  }

  if (!newPlainPassword || newPlainPassword.length < 6) {
    throw new AppError(
      "Senha deve ter no mínimo 6 caracteres",
      HTTP.BAD_REQUEST,
      "WEAK_PASSWORD"
    );
  }

  if (!/\d/.test(newPlainPassword)) {
    throw new AppError(
      "Senha deve ter pelo menos um número",
      HTTP.BAD_REQUEST,
      "PASSWORD_NEEDS_NUMBER"
    );
  }

  const emailTratado = email.trim().toLowerCase();

  const user = await userRepo.findByEmail(emailTratado);

  if (!user) {
    throw new AppError(
      "Email não encontrado",
      HTTP.BAD_REQUEST,
      "EMAIL_NOT_FOUND"
    );
  }

  const hashed = await bcrypt.hash(newPlainPassword, 12);

  await userRepo.updatePassword(user.id, hashed);

  await authRepo.revokeAllUserTokens(user.id);

  return {
    message: "Senha redefinida com sucesso",
  };
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  changePassword,
  resetPassword,
  newPassword,
};
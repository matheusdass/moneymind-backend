const userRepo = require("../repositories/userRepository");
const profileRepo = require("../repositories/profileRepository");
const AppError = require("../utils/AppError");
const MSG = require("../constants/messages");
const HTTP = require("../constants/httpStatus");

async function getProfile(userId) {
  const user = await userRepo.findById(userId);

  if (!user) {
    throw new AppError(
      MSG.PROFILE.NOT_FOUND,
      HTTP.NOT_FOUND,
      "USER_NOT_FOUND"
    );
  }

  const stats = await profileRepo.getStats(userId);

  return {
    ...user,
    stats,
  };
}

async function updateProfile(userId, data) {
  const username = data.username || data.nome;
  const email = data.email;

  const userAtual = await userRepo.findById(userId);

  if (!userAtual) {
    throw new AppError(
      MSG.PROFILE.NOT_FOUND,
      HTTP.NOT_FOUND,
      "USER_NOT_FOUND"
    );
  }

  const updateData = {};

  if (username !== undefined) {
    const usernameTratado = String(username).trim();

    if (!usernameTratado) {
      throw new AppError(
        "Nome é obrigatório",
        HTTP.BAD_REQUEST,
        "USERNAME_REQUIRED"
      );
    }

    if (usernameTratado.length < 3) {
      throw new AppError(
        "Nome muito curto",
        HTTP.BAD_REQUEST,
        "USERNAME_TOO_SHORT"
      );
    }

    if (usernameTratado.length > 50) {
      throw new AppError(
        "Nome muito grande",
        HTTP.BAD_REQUEST,
        "USERNAME_TOO_LONG"
      );
    }

    updateData.username = usernameTratado;
  }

  if (email !== undefined) {
    const emailTratado = String(email).trim().toLowerCase();

    if (!emailTratado) {
      throw new AppError(
        "Email é obrigatório",
        HTTP.BAD_REQUEST,
        "EMAIL_REQUIRED"
      );
    }

    const emailValido = /\S+@\S+\.\S+/;

    if (!emailValido.test(emailTratado)) {
      throw new AppError(
        "Email inválido",
        HTTP.BAD_REQUEST,
        "INVALID_EMAIL"
      );
    }

    const existing = await userRepo.findByEmail(emailTratado);

    if (existing && existing.id !== userId) {
      throw new AppError(
        MSG.PROFILE.EMAIL_TAKEN,
        HTTP.CONFLICT,
        "EMAIL_TAKEN"
      );
    }

    updateData.email = emailTratado;
  }

  if (Object.keys(updateData).length > 0) {
    await userRepo.updateProfile(userId, updateData);
  }

  const updated = await userRepo.findById(userId);

  return {
    message: MSG.PROFILE.UPDATED,
    user: updated,
  };
}

module.exports = {
  getProfile,
  updateProfile,
};
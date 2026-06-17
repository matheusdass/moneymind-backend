const { validationResult } = require("express-validator");
const AppError = require("../utils/AppError");
const HTTP = require("../constants/httpStatus");

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map((e) => ({ field: e.path, message: e.msg }));
    const summary = details.map((e) => `${e.field}: ${e.message}`).join(" | ");
    const err = new AppError(summary, HTTP.BAD_REQUEST, "VALIDATION_ERROR");
    err.details = details; // envia detalhes estruturados ao cliente
    return next(err);
  }
  next();
}

// Sobrescreve o errorHandler para incluir `details` nas respostas de validação
module.exports = validate;
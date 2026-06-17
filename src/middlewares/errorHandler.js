const logger = require("../utils/logger");
const AppError = require("../utils/AppError");
const MSG = require("../constants/messages");
const HTTP = require("../constants/httpStatus");

function handleMySQLError(err) {
  if (err.code === "ER_DUP_ENTRY") {
    const field = err.message.includes("username") ? "usuário" : "email";
    return new AppError(`Este ${field} já está em uso`, HTTP.CONFLICT, "DUPLICATE_ENTRY");
  }
  if (err.code === "ER_NO_REFERENCED_ROW_2") {
    return new AppError("Referência inválida", HTTP.BAD_REQUEST, "INVALID_REFERENCE");
  }
  if (err.code === "ER_DATA_TOO_LONG") {
    return new AppError("Dados muito longos para o campo", HTTP.BAD_REQUEST, "DATA_TOO_LONG");
  }
  return null;
}

function handleJWTError(err) {
  if (err.name === "JsonWebTokenError")
    return new AppError(MSG.AUTH.TOKEN_INVALID, HTTP.FORBIDDEN, "INVALID_TOKEN");
  if (err.name === "TokenExpiredError")
    return new AppError(MSG.AUTH.TOKEN_EXPIRED, HTTP.UNAUTHORIZED, "TOKEN_EXPIRED");
  return null;
}

// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, next) {
  logger.error(`${req.method} ${req.path} → ${err.message}`, {
    stack: err.stack,
    code: err.code,
    statusCode: err.statusCode,
  });

  let error = err;
  if (err.code?.startsWith("ER_")) error = handleMySQLError(err) || err;
  if (["JsonWebTokenError", "TokenExpiredError"].includes(err.name))
    error = handleJWTError(err) || err;

  if (error.isOperational) {
    return res.status(error.statusCode).json({
      status: "error",
      code: error.code || null,
      message: error.message,
    });
  }

  // Bug inesperado — nunca expõe detalhes
  return res.status(HTTP.INTERNAL_SERVER_ERROR).json({
    status: "error",
    message: MSG.GENERIC.INTERNAL_ERROR,
  });
};
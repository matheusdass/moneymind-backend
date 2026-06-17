const { createLogger, format, transports } = require("winston");
const env = require("../config/env");

const { combine, timestamp, colorize, printf, json, errors } = format;

// Formato legível para desenvolvimento
const devFormat = combine(
  colorize(),
  timestamp({ format: "HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack }) =>
    stack
      ? `${timestamp} [${level}] ${message}\n${stack}`
      : `${timestamp} [${level}] ${message}`
  )
);

// Formato JSON para produção (fácil de parsear por ferramentas de log)
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const logger = createLogger({
  level: env.node_env === "production" ? "warn" : "debug",
  format: env.node_env === "production" ? prodFormat : devFormat,
  transports: [
    new transports.Console(),
    ...(env.node_env === "production"
      ? [
          new transports.File({ filename: "logs/error.log", level: "error" }),
          new transports.File({ filename: "logs/combined.log" }),
        ]
      : []),
  ],
});

module.exports = logger;
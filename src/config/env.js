require("dotenv").config();

function getEnv(...names) {
  for (const name of names) {
    const value = process.env[name];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return "";
}

function getNumberEnv(defaultValue, ...names) {
  const value = getEnv(...names);
  const number = Number(value);

  if (!value || Number.isNaN(number)) {
    return defaultValue;
  }

  return number;
}

const node_env = process.env.NODE_ENV || "development";

const dbHost = getEnv("DB_HOST", "MYSQLHOST");
const dbPort = getNumberEnv(3306, "DB_PORT", "MYSQLPORT");
const dbUser = getEnv("DB_USER", "MYSQLUSER");
const dbPassword = getEnv("DB_PASSWORD", "MYSQLPASSWORD");
const dbName = getEnv("DB_NAME", "MYSQLDATABASE");

const jwtSecret = getEnv("JWT_SECRET");
const jwtRefreshSecret = getEnv("JWT_REFRESH_SECRET", "JWT_SECRET");

const required = [];

if (!dbHost) required.push("DB_HOST ou MYSQLHOST");
if (!dbUser) required.push("DB_USER ou MYSQLUSER");
if (!dbName) required.push("DB_NAME ou MYSQLDATABASE");
if (!jwtSecret) required.push("JWT_SECRET");

if (required.length > 0) {
  console.error(
    `Variáveis de ambiente ausentes: ${required.join(", ")}`
  );

  process.exit(1);
}

module.exports = {
  node_env,

  port: getNumberEnv(3001, "PORT"),

  allowed_origin:
    getEnv("ALLOWED_ORIGIN", "FRONTEND_URL") || "*",

  db: {
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    name: dbName,
  },

  jwt: {
    secret: jwtSecret,
    refreshSecret: jwtRefreshSecret,
    expiresIn: getEnv("JWT_EXPIRES_IN") || "15m",
    refreshExpiresIn: getEnv("JWT_REFRESH_EXPIRES_IN") || "7d",
  },

  jwt_secret: jwtSecret,
  jwt_refresh_secret: jwtRefreshSecret,
  jwt_expires_in: getEnv("JWT_EXPIRES_IN") || "15m",
  jwt_refresh_expires_in: getEnv("JWT_REFRESH_EXPIRES_IN") || "7d",

  gemini_api_key:
    getEnv("GEMINI_API_KEY", "GOOGLE_API_KEY", "API_KEY"),

  gemini_model:
    getEnv("GEMINI_MODEL") || "gemini-2.5-flash",

  google_client_id:
    getEnv("GOOGLE_CLIENT_ID"),

  email: {
    user: getEnv("EMAIL_USER"),
    pass: getEnv("EMAIL_PASS"),
    from: getEnv("EMAIL_FROM") || getEnv("EMAIL_USER"),
  },
};
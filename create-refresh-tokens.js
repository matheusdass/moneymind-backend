const mysql = require("mysql2/promise");

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.RAILWAY_MYSQL_HOST,
    port: Number(process.env.RAILWAY_MYSQL_PORT),
    user: process.env.RAILWAY_MYSQL_USER,
    password: process.env.RAILWAY_MYSQL_PASSWORD,
    database: process.env.RAILWAY_MYSQL_DATABASE,
    multipleStatements: true,
  });

  console.log("Conectado ao MySQL do Railway.");

  await connection.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id BINARY(16) NOT NULL DEFAULT (UUID_TO_BIN(UUID())),
      user_id BINARY(16) NOT NULL,
      token VARCHAR(255) NOT NULL,
      expires_at DATETIME NOT NULL,
      ip_address VARCHAR(45) NULL,
      revoked TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_refresh_tokens_token (token),
      KEY idx_refresh_tokens_user_id (user_id),
      KEY idx_refresh_tokens_revoked (revoked),
      KEY idx_refresh_tokens_expires_at (expires_at),
      CONSTRAINT fk_refresh_tokens_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log("Tabela refresh_tokens criada/verificada com sucesso.");

  const [tables] = await connection.query("SHOW TABLES LIKE 'refresh_tokens';");
  console.log(tables);

  await connection.end();
}

main().catch((err) => {
  console.error("Erro:");
  console.error(err);
  process.exit(1);
});
// migrations/run_migration.js
// ============================================================
// Script Node.js para executar a migration com segurança.
// Usa mysql2 — a mesma lib já instalada no projeto.
//
// Como executar:
//   node migrations/run_migration.js
//
// Requer .env preenchido na raiz do projeto.
// ============================================================

require("dotenv").config();
const mysql = require("mysql2/promise");

const DB = {
  host:     process.env.DB_HOST,
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
};

// ── Colunas a adicionar em users ───────────────────────────────
const USER_COLUMNS = [
  {
    name:       "last_login",
    definition: "TIMESTAMP NULL DEFAULT NULL",
    after:      "active",
  },
  {
    name:       "age_verified",
    definition: "TINYINT(1) NOT NULL DEFAULT 0",
    after:      "last_login",
  },
  {
    name:       "birth_date",
    definition: "DATE NULL DEFAULT NULL",
    after:      "age_verified",
  },
  {
    name:       "face_descriptor",
    definition: "JSON NULL DEFAULT NULL",
    after:      "birth_date",
  },
];

// ── Tabelas novas a criar ──────────────────────────────────────
const NEW_TABLES = [

  {
    name: "refresh_tokens",
    sql: `
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id         BINARY(16)   NOT NULL PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID(), 1)),
        user_id    BINARY(16)   NOT NULL,
        token      VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP    NOT NULL,
        revoked    TINYINT(1)   NOT NULL DEFAULT 0,
        ip_address VARCHAR(45)  NULL DEFAULT NULL,
        user_agent VARCHAR(500) NULL DEFAULT NULL,
        created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_refresh_tokens_token UNIQUE (token),
        CONSTRAINT fk_refresh_tokens_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_refresh_tokens_user_id    (user_id),
        INDEX idx_refresh_tokens_expires_at (expires_at),
        INDEX idx_refresh_tokens_revoked    (revoked)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='Refresh tokens JWT'
    `,
  },

  {
    name: "push_notification_tokens",
    sql: `
      CREATE TABLE IF NOT EXISTS push_notification_tokens (
        id         BINARY(16)                  NOT NULL PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID(), 1)),
        user_id    BINARY(16)                  NOT NULL,
        token      VARCHAR(500)                NOT NULL,
        platform   ENUM('ios','android','web') NOT NULL DEFAULT 'android',
        active     TINYINT(1)                  NOT NULL DEFAULT 1,
        created_at TIMESTAMP                   NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP                   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT uq_push_notification_tokens_token UNIQUE (token),
        CONSTRAINT fk_push_notification_tokens_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_push_notification_tokens_user_id (user_id),
        INDEX idx_push_notification_tokens_active  (active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='Tokens Expo Push dos dispositivos'
    `,
  },

  {
    name: "ai_conversations",
    sql: `
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id         BINARY(16)   NOT NULL PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID(), 1)),
        user_id    BINARY(16)   NOT NULL,
        title      VARCHAR(255) NULL DEFAULT NULL,
        active     TINYINT(1)   NOT NULL DEFAULT 1,
        created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_ai_conversations_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_ai_conversations_user_id (user_id),
        INDEX idx_ai_conversations_active  (active),
        INDEX idx_ai_conversations_updated (updated_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='Conversas do chat com a IA'
    `,
  },

  {
    name: "ai_messages",
    sql: `
      CREATE TABLE IF NOT EXISTS ai_messages (
        id              BINARY(16)               NOT NULL PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID(), 1)),
        conversation_id BINARY(16)               NOT NULL,
        user_id         BINARY(16)               NOT NULL,
        role            ENUM('user','assistant') NOT NULL,
        content         TEXT                     NOT NULL,
        tokens_used     INT UNSIGNED             NULL DEFAULT NULL,
        created_at      TIMESTAMP                NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_ai_messages_conversation
          FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE,
        CONSTRAINT fk_ai_messages_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_ai_messages_conversation_id (conversation_id),
        INDEX idx_ai_messages_user_id         (user_id),
        INDEX idx_ai_messages_created_at      (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='Mensagens individuais do chat com a IA'
    `,
  },

  {
    name: "user_ai_preferences",
    sql: `
      CREATE TABLE IF NOT EXISTS user_ai_preferences (
        id          BINARY(16)        NOT NULL PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID(), 1)),
        user_id     BINARY(16)        NOT NULL UNIQUE,
        voice_id    VARCHAR(100)      NULL DEFAULT NULL,
        language    VARCHAR(10)       NOT NULL DEFAULT 'pt-BR',
        tts_enabled TINYINT(1)        NOT NULL DEFAULT 0,
        max_history SMALLINT UNSIGNED NOT NULL DEFAULT 20,
        created_at  TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_user_ai_preferences_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='Preferências de IA e voz por usuário'
    `,
  },
];

// ── Helpers ────────────────────────────────────────────────────
async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = ?
       AND COLUMN_NAME  = ?`,
    [table, column]
  );
  return rows.length > 0;
}

async function tableExists(conn, table) {
  const [rows] = await conn.query(
    `SELECT 1 FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = ?`,
    [table]
  );
  return rows.length > 0;
}

// ── Runner principal ───────────────────────────────────────────
async function runMigration() {
  const conn = await mysql.createConnection(DB);
  console.log(`\n✅ Conectado em ${DB.host}:${DB.port}/${DB.database}\n`);

  let erros = 0;

  try {

    // ── BLOCO 1: colunas em users ──────────────────────────────
    console.log("── Bloco 1: verificando colunas em users ──");

    for (const col of USER_COLUMNS) {
      const existe = await columnExists(conn, "users", col.name);
      if (existe) {
        console.log(`  ⏭  users.${col.name} já existe — ignorado`);
      } else {
        await conn.query(
          `ALTER TABLE users ADD COLUMN ${col.name} ${col.definition} AFTER ${col.after}`
        );
        console.log(`  ✅ users.${col.name} adicionada`);
      }
    }

    // ── BLOCO 2–6: tabelas novas ───────────────────────────────
    console.log("\n── Blocos 2–6: criando tabelas novas ──");

    for (const t of NEW_TABLES) {
      const existe = await tableExists(conn, t.name);
      if (existe) {
        console.log(`  ⏭  Tabela ${t.name} já existe — ignorada`);
      } else {
        await conn.query(t.sql);
        console.log(`  ✅ Tabela ${t.name} criada`);
      }
    }

    // ── Verificação final ──────────────────────────────────────
    console.log("\n── Tabelas em moneymind_db após migration ──");
    const [tabelas] = await conn.query(
      `SELECT TABLE_NAME AS tabela, TABLE_ROWS AS linhas
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
       ORDER BY TABLE_NAME ASC`
    );
    tabelas.forEach((t) => console.log(`  📦 ${t.tabela} (${t.linhas ?? 0} linhas)`));

    console.log("\n✅ Migration concluída sem erros.\n");

  } catch (err) {
    erros++;
    console.error("\n❌ Erro durante a migration:", err.message);
    console.error(err);
  } finally {
    await conn.end();
    process.exit(erros > 0 ? 1 : 0);
  }
}

runMigration();
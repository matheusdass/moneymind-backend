const app = require("./app");

const pool = require("./src/config/db");
const logger = require("./src/utils/logger");
const env = require("./src/config/env");

async function startServer() {
  try {
    await pool.query("SELECT 1");

    logger.info("Banco de dados conectado");

    if (env.node_env !== "production") {
      const [tables] = await pool.query("SHOW TABLES");

      console.log("Tabelas do banco:");
      console.log(tables);
    }

    const server = app.listen(env.port, "0.0.0.0", () => {
      logger.info(
        `Servidor rodando na porta ${env.port} [${env.node_env}]`
      );
    });

    const shutdown = async (signal) => {
      logger.warn(`${signal} recebido. Encerrando servidor...`);

      server.close(async () => {
        try {
          await pool.end();
          logger.info("Servidor encerrado com sucesso");
          process.exit(0);
        } catch (error) {
          logger.error("Erro ao encerrar servidor:", error);
          process.exit(1);
        }
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    process.on("unhandledRejection", (reason) => {
      logger.error("unhandledRejection:", reason);
      shutdown("unhandledRejection");
    });

    process.on("uncaughtException", (err) => {
      logger.error("uncaughtException:", err);
      shutdown("uncaughtException");
    });
  } catch (err) {
    logger.error("Erro ao iniciar servidor:", err);
    process.exit(1);
  }
}

startServer();
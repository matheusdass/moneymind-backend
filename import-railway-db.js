const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

async function main() {
  const required = [
    "RAILWAY_MYSQL_HOST",
    "RAILWAY_MYSQL_PORT",
    "RAILWAY_MYSQL_USER",
    "RAILWAY_MYSQL_PASSWORD",
    "RAILWAY_MYSQL_DATABASE",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("Faltam variáveis:", missing.join(", "));
    process.exit(1);
  }

  const sqlPath = path.join(__dirname, "moneymind_db_backup.sql");

  let sql = fs.readFileSync(sqlPath, "utf8");

  sql = sql
    .replace(/CREATE DATABASE[\s\S]*?;\s*/i, "")
    .replace(/USE\s+`?[^`;\s]+`?\s*;\s*/i, "");

  const connection = await mysql.createConnection({
    host: process.env.RAILWAY_MYSQL_HOST,
    port: Number(process.env.RAILWAY_MYSQL_PORT),
    user: process.env.RAILWAY_MYSQL_USER,
    password: process.env.RAILWAY_MYSQL_PASSWORD,
    database: process.env.RAILWAY_MYSQL_DATABASE,
    multipleStatements: true,
  });

  console.log("Conectado ao MySQL do Railway.");
  console.log("Importando backup...");

  await connection.query("SET FOREIGN_KEY_CHECKS=0;");
  await connection.query(sql);
  await connection.query("SET FOREIGN_KEY_CHECKS=1;");

  const [tables] = await connection.query("SHOW TABLES;");

  console.log("Importação finalizada.");
  console.log("Tabelas encontradas:");
  console.log(tables);

  await connection.end();
}

main().catch((err) => {
  console.error("Erro ao importar:");
  console.error(err);
  process.exit(1);
});
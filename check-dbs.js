require("dotenv").config();

const mysql = require("mysql2/promise");

async function main() {
  const conn = await mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  const sql = "SELECT TABLE_SCHEMA AS banco, COUNT(1) AS tabelas FROM information_schema.TABLES WHERE TABLE_SCHEMA NOT IN ('information_schema','mysql','performance_schema','sys') GROUP BY TABLE_SCHEMA";

  const [rows] = await conn.query(sql);

  console.table(rows);

  await conn.end();
}

main().catch((err) => {
  console.error("ERRO:", err);
});

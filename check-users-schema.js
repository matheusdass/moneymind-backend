require("dotenv").config();
const mysql = require("mysql2/promise");

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "moneymind_db",
  });

  const [rows] = await connection.query("SHOW CREATE TABLE users");
  console.log(rows[0]["Create Table"]);

  await connection.end();
}

main().catch(console.error);
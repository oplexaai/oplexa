import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;
let dbInitialized = false;

function getPool(): mysql.Pool {
  if (!pool) {
    const host = process.env.MYSQL_HOST || "127.0.0.1";
    pool = mysql.createPool({
      host: host === "localhost" ? "127.0.0.1" : host,
      port: parseInt(process.env.MYSQL_PORT || "3306"),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 10000,
      family: 4,
    });
  }
  return pool;
}

export async function initDb() {
  if (dbInitialized) return;
  const db = getPool();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(500) NOT NULL DEFAULT 'New Consultation',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      conversation_id INT NOT NULL,
      role VARCHAR(50) NOT NULL,
      content LONGTEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )
  `);
  dbInitialized = true;
}

export default getPool;

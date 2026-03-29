import { NextResponse } from "next/server";
import getPool, { initDb } from "@/lib/db";

export async function GET() {
  const checks: Record<string, string> = {};

  checks.GEMINI_API_KEY = process.env.GEMINI_API_KEY ? "✅ Set" : "❌ NOT SET";
  checks.MYSQL_HOST = process.env.MYSQL_HOST || "❌ NOT SET";
  checks.MYSQL_USER = process.env.MYSQL_USER ? "✅ Set" : "❌ NOT SET";
  checks.MYSQL_PASSWORD = process.env.MYSQL_PASSWORD ? "✅ Set" : "❌ NOT SET";
  checks.MYSQL_DATABASE = process.env.MYSQL_DATABASE ? "✅ Set" : "❌ NOT SET";

  let dbStatus = "❌ Failed";
  try {
    await initDb();
    const pool = getPool();
    await pool.execute("SELECT 1");
    dbStatus = "✅ Connected";
  } catch (err: any) {
    dbStatus = `❌ Error: ${err?.message}`;
  }

  return NextResponse.json({
    status: "Dr. Nisha Health Check",
    environment: checks,
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
}

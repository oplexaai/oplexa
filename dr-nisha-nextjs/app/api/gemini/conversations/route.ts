import { NextResponse } from "next/server";
import getPool, { initDb } from "@/lib/db";

export async function GET() {
  try {
    await initDb();
    const pool = getPool();
    const [rows] = await pool.execute(
      "SELECT * FROM conversations ORDER BY created_at DESC"
    );
    return NextResponse.json(rows);
  } catch (err: any) {
    console.error("GET /conversations error:", err);
    return NextResponse.json(
      { error: "Database connection failed. Check MySQL environment variables.", detail: err?.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const pool = getPool();
    const { title } = await request.json();
    const [result] = await pool.execute(
      "INSERT INTO conversations (title) VALUES (?)",
      [title || "New Consultation"]
    ) as any[];
    const [rows] = await pool.execute(
      "SELECT * FROM conversations WHERE id = ?",
      [result.insertId]
    ) as any[];
    return NextResponse.json((rows as any[])[0], { status: 201 });
  } catch (err: any) {
    console.error("POST /conversations error:", err);
    return NextResponse.json(
      { error: "Database connection failed. Check MySQL environment variables.", detail: err?.message },
      { status: 500 }
    );
  }
}

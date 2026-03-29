import { NextResponse } from "next/server";
import pool, { initDb } from "@/lib/db";

export async function GET() {
  try {
    await initDb();
    const [rows] = await pool.execute(
      "SELECT * FROM conversations ORDER BY created_at DESC"
    );
    return NextResponse.json(rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
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
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

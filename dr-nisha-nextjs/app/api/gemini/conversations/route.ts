import { NextResponse } from "next/server";
import { isMySQLConfigured, getPool, initDb } from "@/lib/db";
import { fsGetConversations, fsCreateConversation } from "@/lib/fileStorage";

export async function GET() {
  if (!isMySQLConfigured()) {
    return NextResponse.json(fsGetConversations());
  }
  try {
    await initDb();
    const pool = getPool();
    const [rows] = await pool.execute(
      "SELECT * FROM conversations ORDER BY created_at DESC"
    );
    return NextResponse.json(rows);
  } catch (err: any) {
    console.error("MySQL failed, using file storage:", err?.message);
    return NextResponse.json(fsGetConversations());
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const title = body?.title || "New Consultation";

  if (!isMySQLConfigured()) {
    const conv = fsCreateConversation(title);
    return NextResponse.json(conv, { status: 201 });
  }
  try {
    await initDb();
    const pool = getPool();
    const [result] = (await pool.execute(
      "INSERT INTO conversations (title) VALUES (?)",
      [title]
    )) as any[];
    const [rows] = (await pool.execute(
      "SELECT * FROM conversations WHERE id = ?",
      [result.insertId]
    )) as any[];
    return NextResponse.json((rows as any[])[0], { status: 201 });
  } catch (err: any) {
    console.error("MySQL failed, using file storage:", err?.message);
    const conv = fsCreateConversation(title);
    return NextResponse.json(conv, { status: 201 });
  }
}

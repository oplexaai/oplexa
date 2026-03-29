import { NextResponse } from "next/server";
import { isMySQLConfigured, getPool, initDb } from "@/lib/db";
import { fsGetConversation, fsDeleteConversation } from "@/lib/fileStorage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const convId = parseInt(id);

  if (!isMySQLConfigured()) {
    const conv = fsGetConversation(convId);
    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(conv);
  }
  try {
    await initDb();
    const pool = getPool();
    const [convRows] = (await pool.execute(
      "SELECT * FROM conversations WHERE id = ?",
      [convId]
    )) as any[];
    if (!(convRows as any[]).length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const [msgRows] = (await pool.execute(
      "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
      [convId]
    )) as any[];
    return NextResponse.json({ ...(convRows as any[])[0], messages: msgRows });
  } catch (err: any) {
    console.error("MySQL failed, using file storage:", err?.message);
    const conv = fsGetConversation(convId);
    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(conv);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const convId = parseInt(id);

  if (!isMySQLConfigured()) {
    fsDeleteConversation(convId);
    return NextResponse.json({ ok: true });
  }
  try {
    await initDb();
    const pool = getPool();
    await pool.execute("DELETE FROM conversations WHERE id = ?", [convId]);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("MySQL failed, using file storage:", err?.message);
    fsDeleteConversation(convId);
    return NextResponse.json({ ok: true });
  }
}

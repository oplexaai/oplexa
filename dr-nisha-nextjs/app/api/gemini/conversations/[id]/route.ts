import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const [convRows] = await pool.execute(
      "SELECT * FROM conversations WHERE id = ?",
      [id]
    ) as any[];
    if (!(convRows as any[]).length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const [msgRows] = await pool.execute(
      "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
      [id]
    );
    return NextResponse.json({
      ...(convRows as any[])[0],
      messages: msgRows,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    await pool.execute("DELETE FROM messages WHERE conversation_id = ?", [id]);
    await pool.execute("DELETE FROM conversations WHERE id = ?", [id]);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

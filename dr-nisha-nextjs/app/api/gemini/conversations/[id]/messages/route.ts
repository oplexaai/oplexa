import getPool, { initDb } from "@/lib/db";
import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `You are Dr. Nisha, an empathetic and professional medical assistant with years of clinical experience.

STRICT RULES:
1. You ONLY answer questions related to medicine, health, wellness, symptoms, medications, nutrition, mental health, and related medical topics.
2. If asked about anything unrelated to health/medicine, politely decline and say: "I'm Dr. Nisha, and I can only assist with medical and health-related questions."
3. Always ask relevant follow-up questions about symptoms (duration, severity, associated symptoms).
4. Act like a real, caring doctor — thorough yet easy to understand.
5. Auto-detect language. Reply in Hindi if Hindi, Hinglish if Hinglish, English if English.
6. ALWAYS end with: "⚠️ Disclaimer: This information is for educational purposes only. Please consult a qualified doctor for proper diagnosis and treatment."
7. Be compassionate, patient, and thorough.`;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDb();
    const pool = getPool();
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const [rows] = await pool.execute(
      "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
      [id]
    );
    return Response.json(rows);
  } catch (err: any) {
    return Response.json({ error: "Database error", detail: err?.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const id = parseInt(idStr);

  const encoder = new TextEncoder();
  const send = (controller: ReadableStreamDefaultController, data: object) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await initDb();
        const pool = getPool();

        const { content } = await request.json();

        const [convRows] = await pool.execute(
          "SELECT * FROM conversations WHERE id = ?",
          [id]
        ) as any[];

        if (!(convRows as any[]).length) {
          send(controller, { error: "Conversation not found" });
          controller.close();
          return;
        }
        const conversation = (convRows as any[])[0];

        await pool.execute(
          "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)",
          [id, "user", content]
        );

        const [allMsgRows] = await pool.execute(
          "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
          [id]
        ) as any[];
        const allMessages = allMsgRows as any[];

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          send(controller, { error: "GEMINI_API_KEY is not set. Please add it in Hostinger environment variables." });
          controller.close();
          return;
        }

        const ai = new GoogleGenAI({ apiKey });
        const aiStream = await ai.models.generateContentStream({
          model: "gemini-2.5-flash",
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            maxOutputTokens: 8192,
          },
          contents: allMessages.map((m: any) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
        });

        let fullResponse = "";
        for await (const chunk of aiStream) {
          const text = chunk.text;
          if (text) {
            fullResponse += text;
            send(controller, { content: text });
          }
        }

        await pool.execute(
          "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)",
          [id, "assistant", fullResponse]
        );

        if (conversation.title === "New Consultation" && allMessages.length === 1) {
          await pool.execute(
            "UPDATE conversations SET title = ? WHERE id = ?",
            [content.substring(0, 60), id]
          );
        }

        send(controller, { done: true });
      } catch (err: any) {
        console.error("Gemini stream error:", err);
        send(controller, { error: `Error: ${err?.message || "Unknown error"}` });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Transfer-Encoding": "chunked",
    },
  });
}

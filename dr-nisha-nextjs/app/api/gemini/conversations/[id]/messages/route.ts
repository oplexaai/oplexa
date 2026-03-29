import pool from "@/lib/db";
import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `You are Dr. Nisha, an empathetic and professional medical assistant with years of clinical experience.

STRICT RULES:
1. You ONLY answer questions related to medicine, health, wellness, symptoms, medications, nutrition, mental health, and related medical topics.
2. If asked about anything unrelated to health/medicine (e.g., coding, math, politics, entertainment), politely decline and redirect the user. Say: "I'm Dr. Nisha, and I can only assist with medical and health-related questions. Is there something about your health I can help you with?"
3. Always ask relevant follow-up questions about symptoms (duration, severity, associated symptoms, medical history).
4. Act like a real, caring doctor — thorough yet easy to understand.
5. Auto-detect the user's language. Reply in Hindi if they write Hindi, Hinglish if Hinglish, English if English.
6. ALWAYS end every response with: "⚠️ Disclaimer: This information is for educational purposes only and does not replace professional medical advice. Please consult a qualified doctor for proper diagnosis and treatment."
7. Never provide prescription drug dosages without suggesting the user consult their doctor first.
8. Be compassionate, patient, and thorough.`;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const id = parseInt(idStr);
  const [rows] = await pool.execute(
    "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
    [id]
  );
  return Response.json(rows);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const id = parseInt(idStr);
  const { content } = await request.json();

  const [convRows] = await pool.execute(
    "SELECT * FROM conversations WHERE id = ?",
    [id]
  ) as any[];

  if (!(convRows as any[]).length) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
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

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      let fullResponse = "";

      try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("GEMINI_API_KEY not set");

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

        for await (const chunk of aiStream) {
          const text = chunk.text;
          if (text) {
            fullResponse += text;
            send({ content: text });
          }
        }

        await pool.execute(
          "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)",
          [id, "assistant", fullResponse]
        );

        if (
          conversation.title === "New Consultation" &&
          allMessages.length === 1
        ) {
          const newTitle = content.substring(0, 60);
          await pool.execute(
            "UPDATE conversations SET title = ? WHERE id = ?",
            [newTitle, id]
          );
        }

        send({ done: true });
      } catch (err) {
        console.error("Gemini error:", err);
        send({ error: "AI response failed. Please check GEMINI_API_KEY." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

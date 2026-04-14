import { isMySQLConfigured, getPool, initDb } from "@/lib/db";
import { fsGetMessages, fsAddMessage, fsGetConversation } from "@/lib/fileStorage";
import Groq from "groq-sdk";
import { NextRequest } from "next/server";

const _rlMap = new Map<string, { c: number; r: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const e = _rlMap.get(ip);
  if (!e || now > e.r) { _rlMap.set(ip, { c: 1, r: now + 60000 }); return true; }
  if (e.c >= 8) return false;
  e.c++;
  return true;
}

const SYSTEM_INSTRUCTION = `You are Oplexa, a powerful and intelligent AI assistant — similar to ChatGPT or Gemini, but smarter and more personal.

BEHAVIOR RULES:
1. You can help with ANYTHING — coding, writing, analysis, math, creative tasks, business ideas, research, translation, general knowledge, and more.
2. Auto-detect the user's language and always reply in the same language. If they write Hindi, reply in Hindi. If Hinglish, reply in Hinglish. If English, reply in English. Mix naturally as they do.
3. Be conversational, warm, and helpful — like a brilliant friend who knows everything.
4. Never say "As an AI, I cannot..." unnecessarily. Just help.
5. For coding: provide working, clean code with brief explanations.
6. For creative tasks: be imaginative and produce high-quality output.
7. Format responses clearly — use markdown (bold, lists, code blocks) when helpful. Keep responses concise but complete.
8. You have memory of the full conversation — use context from earlier messages to give better, personalized answers.
9. Do NOT repeat yourself or add unnecessary filler text. Get to the point.`;

async function getMessageHistory(convId: number) {
  if (!isMySQLConfigured()) {
    return fsGetMessages(convId).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user" as "user" | "assistant",
      content: m.content,
    }));
  }
  try {
    await initDb();
    const pool = getPool();
    const [rows] = (await pool.execute(
      "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
      [convId]
    )) as any[];
    return (rows as any[]).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user" as "user" | "assistant",
      content: m.content,
    }));
  } catch {
    return fsGetMessages(convId).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user" as "user" | "assistant",
      content: m.content,
    }));
  }
}

async function saveMessage(convId: number, role: string, content: string) {
  if (!isMySQLConfigured()) {
    fsAddMessage(convId, role, content);
    return;
  }
  try {
    await initDb();
    const pool = getPool();
    await pool.execute(
      "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)",
      [convId, role, content]
    );
  } catch {
    fsAddMessage(convId, role, content);
  }
}

async function getConversationTitle(convId: number): Promise<string> {
  if (!isMySQLConfigured()) {
    return fsGetConversation(convId)?.title || "New Consultation";
  }
  try {
    const pool = getPool();
    const [rows] = (await pool.execute(
      "SELECT title FROM conversations WHERE id = ?",
      [convId]
    )) as any[];
    return (rows as any[])[0]?.title || "New Consultation";
  } catch {
    return "New Consultation";
  }
}

async function updateConversationTitle(convId: number, title: string) {
  if (!isMySQLConfigured()) return;
  try {
    const pool = getPool();
    await pool.execute("UPDATE conversations SET title = ? WHERE id = ?", [title, convId]);
  } catch {}
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (!checkRateLimit(ip)) {
    const encoder = new TextEncoder();
    return new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Aap bahut jaldi message kar rahe hain. Ek minute ruk kar dobara try karein. 🙏" })}\n\n`
            )
          );
          controller.close();
        },
      }),
      { status: 429, headers: { "Content-Type": "text/event-stream" } }
    );
  }

  const { id } = await params;
  const convId = parseInt(id);

  const body = await request.json().catch(() => ({}));
  const userContent: string = body?.content || "";
  if (!userContent.trim()) {
    return new Response(JSON.stringify({ error: "Message cannot be empty" }), { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
          send({ error: "GROQ_API_KEY is not set. Please add it in environment variables." });
          controller.close();
          return;
        }

        await saveMessage(convId, "user", userContent);
        const history = await getMessageHistory(convId);
        const historyWithoutLast = history.slice(0, -1);

        const groq = new Groq({ apiKey });

        const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
          { role: "system", content: SYSTEM_INSTRUCTION },
          ...historyWithoutLast.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          { role: "user", content: userContent },
        ];

        const result = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages,
          stream: true,
          max_tokens: 1024,
          temperature: 0.7,
        });

        let fullResponse = "";
        for await (const chunk of result) {
          const text = chunk.choices[0]?.delta?.content || "";
          if (text) {
            fullResponse += text;
            send({ content: text });
          }
        }

        await saveMessage(convId, "assistant", fullResponse);

        const convTitle = await getConversationTitle(convId);
        if (convTitle === "New Chat") {
          await updateConversationTitle(convId, userContent.substring(0, 60));
        }

        send({ done: true });
      } catch (err: any) {
        console.error("Groq stream error:", err);
        const raw = err?.message || "";
        let errMsg = "Kuch gadbad ho gayi. Dobara try karein.";
        if (raw.includes("429") || raw.includes("quota") || raw.includes("Too Many") || raw.includes("rate_limit_exceeded")) {
          errMsg = "Dr. Nisha thodi busy hain abhi. Thori der baad try karein. 🙏";
        } else if (raw.includes("API_KEY") || raw.includes("invalid") || raw.includes("auth")) {
          errMsg = "API key mein kuch problem hai. Admin se contact karein.";
        }
        send({ error: errMsg });
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
    },
  });
}

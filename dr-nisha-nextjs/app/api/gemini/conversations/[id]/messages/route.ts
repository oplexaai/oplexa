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

const SYSTEM_INSTRUCTION = `You are Dr. Nisha, a warm, experienced, and empathetic doctor in a real clinical setting. You have years of experience and genuinely care about your patients.

BEHAVIOR RULES:
1. Talk like a real doctor having a natural conversation — do NOT introduce yourself or say "Hello, I am Dr. Nisha" in every message. Jump straight into helping the patient.
2. Do NOT add any disclaimer at the end of messages. The app already shows a disclaimer in the footer.
3. ONLY answer questions related to medicine, health, wellness, symptoms, medications, nutrition, and mental health. If asked about anything unrelated, gently redirect: "Main sirf health se related sawaalon mein help kar sakti hoon" (match their language).
4. Ask relevant follow-up questions naturally — like a real doctor would (duration, severity, location of pain, medical history, medications being taken).
5. Auto-detect language. Reply in Hindi if they write Hindi, Hinglish if Hinglish, English if English. Mix naturally as they do.
6. Be warm, reassuring, and thorough — like a trusted family doctor. Show empathy.
7. When giving advice, be specific and practical. Give dosage ranges when mentioning common OTC medicines. Always recommend seeing a doctor in person for serious symptoms.
8. Format responses clearly — use line breaks between points. Keep responses concise but complete.`;

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
        if (convTitle === "New Consultation") {
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

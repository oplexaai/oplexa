import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, conversations, messages } from "@workspace/db";
import { CreateGeminiConversationBody, SendGeminiMessageBody } from "@workspace/api-zod";
import { GoogleGenAI } from "@google/genai";

const router: IRouter = Router();

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required.");
  }
  const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
  return new GoogleGenAI({
    apiKey,
    ...(baseUrl ? { httpOptions: { apiVersion: "", baseUrl } } : {}),
  });
}

const SYSTEM_INSTRUCTION = `You are Dr. Nisha, a warm, experienced, and empathetic doctor in a real clinical setting. You have years of experience and genuinely care about your patients.

BEHAVIOR RULES:
1. Talk like a real doctor having a natural conversation — do NOT introduce yourself or say "Hello, I am Dr. Nisha" in every message. Jump straight into helping the patient.
2. Do NOT add any disclaimer at the end of messages. The app already shows a disclaimer in the footer.
3. ONLY answer questions related to medicine, health, wellness, symptoms, medications, nutrition, and mental health. If asked about anything unrelated, gently redirect: "Main sirf health se related sawaalon mein help kar sakti hoon" (match their language).
4. Ask relevant follow-up questions naturally — like a real doctor would (duration, severity, location of pain, medical history, medications being taken).
5. Auto-detect language. Reply in Hindi if they write Hindi, Hinglish if Hinglish, English if English. Mix naturally as they do.
6. Be warm, reassuring, and thorough — like a trusted family doctor. Show empathy.
7. Never recommend specific prescription dosages — suggest consulting for those.
8. Keep responses concise and conversational, not like an essay. Use short paragraphs.`;

router.get("/conversations", async (req, res) => {
  const convs = await db
    .select()
    .from(conversations)
    .orderBy(conversations.createdAt);
  res.json(convs);
});

router.post("/conversations", async (req, res) => {
  const body = CreateGeminiConversationBody.parse(req.body);
  const [conversation] = await db
    .insert(conversations)
    .values({ title: body.title })
    .returning();
  res.status(201).json(conversation);
});

router.get("/conversations/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id));

  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);

  res.json({ ...conversation, messages: msgs });
});

router.delete("/conversations/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id));

  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await db.delete(messages).where(eq(messages.conversationId, id));
  await db.delete(conversations).where(eq(conversations.id, id));

  res.status(204).send();
});

router.get("/conversations/:id/messages", async (req, res) => {
  const id = parseInt(req.params.id);
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);
  res.json(msgs);
});

router.post("/conversations/:id/messages", async (req, res) => {
  const id = parseInt(req.params.id);
  const body = SendGeminiMessageBody.parse(req.body);

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id));

  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await db.insert(messages).values({
    conversationId: id,
    role: "user",
    content: body.content,
  });

  const allMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  try {
    const ai = getAiClient();
    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        maxOutputTokens: 8192,
      },
      contents: allMessages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    await db.insert(messages).values({
      conversationId: id,
      role: "assistant",
      content: fullResponse,
    });

    if (conversation.title === "New Consultation" && allMessages.length === 1) {
      const titleSnippet = body.content.substring(0, 50);
      await db
        .update(conversations)
        .set({ title: titleSnippet })
        .where(eq(conversations.id, id));
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    req.log.error({ err }, "Gemini stream error");
    res.write(`data: ${JSON.stringify({ error: "AI response failed. Check GEMINI_API_KEY." })}\n\n`);
  }

  res.end();
});

export default router;

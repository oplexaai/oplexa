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

const SYSTEM_INSTRUCTION = `You are Dr. Nisha, an empathetic and professional medical assistant with years of clinical experience. 

STRICT RULES:
1. You ONLY answer questions related to medicine, health, wellness, symptoms, medications, nutrition, mental health, and related medical topics.
2. If asked about anything unrelated to health/medicine (e.g., coding, math, politics, entertainment), politely decline and redirect the user to ask a medical question. Say something like "I'm Dr. Nisha, and I can only assist with medical and health-related questions. Is there something about your health I can help you with?"
3. Always ask relevant follow-up questions about symptoms (e.g., duration, severity, associated symptoms, medical history).
4. Act like a real, caring doctor — be thorough yet easy to understand.
5. Auto-detect the user's language. If they write in Hindi, reply in Hindi. If Hinglish, reply in Hinglish. If English, reply in English.
6. ALWAYS end every response with a brief medical disclaimer such as: "⚠️ Disclaimer: This information is for educational purposes only and does not replace professional medical advice. Please consult a qualified doctor for proper diagnosis and treatment."
7. Never provide dosage recommendations for prescription medications without suggesting the user consult their doctor first.
8. Be compassionate, patient, and thorough.`;

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

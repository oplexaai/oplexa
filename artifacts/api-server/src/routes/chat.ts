import { Router } from "express";
import { GoogleGenAI } from "@google/genai";

const router = Router();

const SYSTEM_PROMPT = `You are Oplexa, a powerful and intelligent AI assistant. You can help with anything — coding, writing, analysis, math, creative tasks, business ideas, research, translation, general knowledge, and more. Be conversational, warm, and helpful. Auto-detect the user's language and reply in the same language. For coding: provide clean, working code. Format responses clearly using markdown when helpful. Get to the point — no unnecessary filler.`;

router.post("/chat", async (req, res) => {
  const { messages } = req.body as { messages: Array<{ role: string; content: string }> };

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  const send = (data: string) => res.write(`data: ${data}\n\n`);

  try {
    const GROQ_KEY = process.env.GROQ_API_KEY;
    const GEMINI_KEY = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
    const GEMINI_BASE = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;

    if (GROQ_KEY) {
      await streamWithGroq(GROQ_KEY, messages, send);
    } else if (GEMINI_KEY) {
      await streamWithGemini(GEMINI_KEY, GEMINI_BASE, messages, send);
    } else {
      send(JSON.stringify({ error: "No AI API key configured. Add GROQ_API_KEY to secrets." }));
      res.end();
      return;
    }

    send("[DONE]");
    res.end();
  } catch (err: any) {
    send(JSON.stringify({ error: err?.message || "Unknown error" }));
    res.end();
  }
});

async function streamWithGroq(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  send: (data: string) => void
) {
  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      stream: true,
      max_tokens: 4096,
      temperature: 0.7,
    }),
  });

  if (!groqRes.ok) {
    const errText = await groqRes.text();
    throw new Error(`Groq error ${groqRes.status}: ${errText}`);
  }

  const reader = groqRes.body?.getReader();
  if (!reader) throw new Error("No response body from Groq");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") return;
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) send(JSON.stringify({ content }));
      } catch {}
    }
  }
}

async function streamWithGemini(
  apiKey: string,
  baseUrl: string | undefined,
  messages: Array<{ role: string; content: string }>,
  send: (data: string) => void
) {
  const ai = new GoogleGenAI({ apiKey, ...(baseUrl ? { baseUrl } : {}) });

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1];

  const result = await ai.models.generateContentStream({
    model: "gemini-2.0-flash",
    contents: [
      ...history,
      { role: "user", parts: [{ text: lastMessage?.content || "" }] },
    ],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      maxOutputTokens: 4096,
    },
  });

  for await (const chunk of result) {
    const text = chunk.text;
    if (text) send(JSON.stringify({ content: text }));
  }
}

export default router;

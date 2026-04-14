import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import { db, aiConfig } from "@workspace/db";

const router = Router();

const DEFAULT_SYSTEM_PROMPT = `You are Oplexa, a powerful and intelligent AI assistant. You can help with anything — coding, writing, analysis, math, creative tasks, business ideas, research, translation, general knowledge, and more. Be conversational, warm, and helpful. Auto-detect the user's language and reply in the same language. For coding: provide clean, working code. Format responses clearly using markdown when helpful. Get to the point — no unnecessary filler.`;

let _cachedPrompt: string | null = null;
let _cacheTime = 0;

async function getSystemPrompt(): Promise<string> {
  const now = Date.now();
  if (_cachedPrompt !== null && now - _cacheTime < 30_000) return _cachedPrompt;
  try {
    const [config] = await db.select().from(aiConfig).limit(1);
    if (config && (config.systemPrompt || config.personality || config.restrictions)) {
      let prompt = `You are Oplexa, a powerful and intelligent AI assistant.`;
      if (config.personality) prompt += `\n\n${config.personality}`;
      if (config.systemPrompt) prompt += `\n\n${config.systemPrompt}`;
      if (config.restrictions) prompt += `\n\nRestrictions:\n${config.restrictions}`;
      prompt += `\n\nAuto-detect the user's language and reply in the same language. For coding: provide clean, working code. Format responses clearly using markdown when helpful. Get to the point — no unnecessary filler.`;
      _cachedPrompt = prompt;
    } else {
      _cachedPrompt = DEFAULT_SYSTEM_PROMPT;
    }
    _cacheTime = now;
  } catch {
    _cachedPrompt = DEFAULT_SYSTEM_PROMPT;
  }
  return _cachedPrompt;
}

export function invalidatePromptCache() {
  _cachedPrompt = null;
  _cacheTime = 0;
}

type ContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
type ApiMessage = { role: string; content: string | ContentPart[] };

function hasImage(messages: ApiMessage[]): boolean {
  return messages.some(m => Array.isArray(m.content) && m.content.some(p => p.type === "image_url"));
}

function buildGroqMessages(messages: ApiMessage[], systemPrompt: string) {
  const sys = { role: "system", content: systemPrompt };
  const msgs = messages.map(m => {
    if (!Array.isArray(m.content)) return m;
    const parts = m.content as ContentPart[];
    const textPart = parts.find(p => p.type === "text") as { type: "text"; text: string } | undefined;
    const imgPart = parts.find(p => p.type === "image_url") as { type: "image_url"; image_url: { url: string } } | undefined;
    const content: ContentPart[] = [];
    if (imgPart) content.push(imgPart);
    if (textPart && textPart.text) content.push(textPart);
    else content.push({ type: "text", text: "What's in this image? Describe it in detail." });
    return { role: m.role, content };
  });
  return [sys, ...msgs];
}

router.post("/chat", async (req, res) => {
  const { messages } = req.body as { messages: ApiMessage[] };

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
    const systemPrompt = await getSystemPrompt();

    const withVision = hasImage(messages);
    if (GROQ_KEY) {
      await streamWithGroq(GROQ_KEY, messages, systemPrompt, send, withVision);
    } else if (GEMINI_KEY) {
      await streamWithGemini(GEMINI_KEY, GEMINI_BASE, messages, systemPrompt, send);
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
  messages: ApiMessage[],
  systemPrompt: string,
  send: (data: string) => void,
  withVision = false
) {
  const model = withVision ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile";
  const builtMessages = withVision ? buildGroqMessages(messages, systemPrompt) : [{ role: "system", content: systemPrompt }, ...messages];
  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: builtMessages,
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
  systemPrompt: string,
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
      systemInstruction: systemPrompt,
      maxOutputTokens: 4096,
    },
  });

  for await (const chunk of result) {
    const text = chunk.text;
    if (text) send(JSON.stringify({ content: text }));
  }
}

export default router;

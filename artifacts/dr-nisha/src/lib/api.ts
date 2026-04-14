import { getToken } from "./auth";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  imageUrl?: string;
}

type ContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

function buildMessagePayload(messages: ChatMessage[]) {
  return messages.map(m => {
    if (!m.imageUrl) return { role: m.role, content: m.content };
    const parts: ContentPart[] = [
      { type: "image_url", image_url: { url: m.imageUrl } },
    ];
    if (m.content) parts.push({ type: "text", text: m.content });
    return { role: m.role, content: parts };
  });
}

export async function streamChat(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  signal?: AbortSignal,
  onError?: (errMsg: string) => void
): Promise<void> {
  const token = getToken();
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ messages: buildMessagePayload(messages) }),
    signal,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || `Server error ${response.status}`);
  }

  if (!response.body) throw new Error("No response stream");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") return;
      try {
        const parsed = JSON.parse(data);
        if (parsed.error) {
          const errMsg = `Error: ${parsed.error}`;
          if (onError) onError(errMsg);
          else onChunk(errMsg);
          return;
        }
        const text = parsed.content;
        if (text) onChunk(text);
      } catch {}
    }
  }
}

import { Platform } from "react-native";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  imageUrl?: string;
}

type ContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

function buildPayload(messages: ChatMessage[]) {
  return messages.map(m => {
    if (!m.imageUrl) return { role: m.role, content: m.content };
    const parts: ContentPart[] = [{ type: "image_url", image_url: { url: m.imageUrl } }];
    if (m.content) parts.push({ type: "text", text: m.content });
    return { role: m.role, content: parts };
  });
}

let messageCounter = 0;
export function generateMessageId(): string {
  messageCounter++;
  return `msg-${Date.now()}-${messageCounter}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getApiBase(): string {
  // Production build: EXPO_PUBLIC_API_URL set → e.g. https://oplexa.in (EC2)
  const explicitUrl = process.env.EXPO_PUBLIC_API_URL;
  if (explicitUrl) return explicitUrl.replace(/\/$/, "");
  // Web dev: Metro proxies /api/* → localhost:8080 (same-origin)
  if (Platform.OS === "web") return "";
  // Native dev: use EXPO_PUBLIC_DOMAIN
  const domain = process.env.EXPO_PUBLIC_DOMAIN || "";
  if (!domain) return "";
  return `https://${domain}/api-server`;
}

export async function streamChat(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  onDone?: () => void,
  onError?: (err: Error) => void,
  token?: string | null
): Promise<void> {
  const apiBase = getApiBase();
  // Web: /api/chat (relative, Metro proxies) | Native: absolute URL
  const chatUrl = Platform.OS === "web" ? "/api/chat" : `${apiBase}/api/chat`;

  if (Platform.OS !== "web" && !apiBase) {
    onError?.(new Error("API server not configured. Set EXPO_PUBLIC_DOMAIN."));
    return;
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "text/event-stream",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(chatUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ messages: buildPayload(messages) }),
      ...(Platform.OS !== "web" ? { reactNative: { textStreaming: true } } : {}),
    } as any);

    if (!response.ok) {
      const errText = await response.text().catch(() => "Unknown error");
      throw new Error(`API error ${response.status}: ${errText}`);
    }

    if (Platform.OS === "web") {
      const text = await response.text();
      const lines = text.split("\n");
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") { onDone?.(); return; }
        try {
          const parsed = JSON.parse(data);
          if (parsed.content) onChunk(parsed.content);
        } catch {}
      }
      onDone?.();
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      const text = await response.text?.() || "";
      const lines = text.split("\n");
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") { onDone?.(); return; }
        try {
          const parsed = JSON.parse(data);
          if (parsed.content) onChunk(parsed.content);
        } catch {}
      }
      onDone?.();
      return;
    }

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
        if (data === "[DONE]") { onDone?.(); return; }
        try {
          const parsed = JSON.parse(data);
          if (parsed.content) onChunk(parsed.content);
        } catch {}
      }
    }

    onDone?.();
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error(String(err)));
  }
}

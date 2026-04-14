import { fetch } from "expo/fetch";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

let messageCounter = 0;
export function generateMessageId(): string {
  messageCounter++;
  return `msg-${Date.now()}-${messageCounter}-${Math.random().toString(36).substr(2, 9)}`;
}

function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN || "";
  if (!domain) return "";
  return `https://${domain}/api-server`;
}

export async function streamChat(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  onDone?: () => void,
  onError?: (err: Error) => void
): Promise<void> {
  const apiBase = getApiBase();

  try {
    const response = await fetch(`${apiBase}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "Unknown error");
      throw new Error(`API error ${response.status}: ${errText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

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
        if (data === "[DONE]") {
          onDone?.();
          return;
        }
        try {
          const parsed = JSON.parse(data);
          const content = parsed.content;
          if (content) onChunk(content);
        } catch {}
      }
    }

    onDone?.();
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error(String(err)));
  }
}

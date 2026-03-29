"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { EmptyState } from "./EmptyState";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
}

interface Props {
  activeId: number | null;
  onCreateNew: () => Promise<number | null>;
  isCreating: boolean;
  userName: string | null;
  onError: (msg: string) => void;
}

export function ChatArea({ activeId, onCreateNew, isCreating, userName, onError }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (activeId) {
      loadMessages(activeId);
    } else {
      setMessages([]);
    }
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const loadMessages = async (id: number) => {
    try {
      const res = await fetch(`/api/gemini/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {}
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    let convId = activeId;
    if (!convId) {
      convId = await onCreateNew();
      if (!convId) return;
    }

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", content: text },
    ]);
    setStreaming(true);
    setStreamingText("");

    try {
      const res = await fetch(`/api/gemini/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });

      if (!res.ok) {
        const err = await res.json();
        onError(err?.error || "Failed to send message.");
        setStreaming(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.content) {
              accumulated += parsed.content;
              setStreamingText(accumulated);
            }
            if (parsed.done) {
              setMessages((prev) => [
                ...prev,
                { id: Date.now() + 1, role: "assistant", content: accumulated },
              ]);
              setStreamingText("");
              setStreaming(false);
            }
            if (parsed.error) {
              onError(parsed.error);
              setMessages((prev) => [
                ...prev,
                { id: Date.now() + 1, role: "assistant", content: `❌ ${parsed.error}` },
              ]);
              setStreamingText("");
              setStreaming(false);
            }
          } catch {}
        }
      }
    } catch (err: any) {
      onError("Connection error. Please check your internet and try again.");
      setStreaming(false);
      setStreamingText("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto pt-20 pb-4">
        {!activeId && messages.length === 0 ? (
          <EmptyState
            onStartNew={async () => { await onCreateNew(); }}
            isCreating={isCreating}
          />
        ) : (
          <div className="max-w-3xl mx-auto py-4 space-y-1">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} userName={userName} />
            ))}
            {streaming && streamingText && (
              <MessageBubble
                message={{ id: -1, role: "assistant", content: streamingText }}
                userName={userName}
              />
            )}
            {streaming && !streamingText && (
              <div className="flex justify-start px-4 py-1">
                <div className="flex items-end gap-2">
                  <div className="w-7 h-7 rounded-full overflow-hidden border border-border flex-shrink-0">
                    <img src="/dr-nisha.jpg" alt="Dr. Nisha" className="w-full h-full object-cover" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1 items-center h-4">
                      <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border bg-background/80 backdrop-blur-md px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3 bg-muted rounded-2xl px-4 py-3 border border-border focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask Dr. Nisha a health question... (English / Hindi / Hinglish)"
              rows={1}
              className="flex-1 bg-transparent resize-none text-foreground placeholder:text-muted-foreground text-sm focus:outline-none leading-relaxed"
              style={{ maxHeight: "120px" }}
              disabled={streaming}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || streaming}
              className="flex-shrink-0 w-9 h-9 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all"
            >
              {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            Dr. Nisha provides health information, not a substitute for medical advice.
          </p>
        </div>
      </div>
    </div>
  );
}

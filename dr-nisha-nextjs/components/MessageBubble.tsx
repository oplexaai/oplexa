"use client";

import ReactMarkdown from "react-markdown";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

interface Props {
  message: Message;
  userName?: string | null;
  isStreaming?: boolean;
}

export function MessageBubble({ message, userName, isStreaming }: Props) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-1">
        <div className="flex items-end gap-2 max-w-[80%]">
          <div className="bg-blue-500 text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed shadow-sm">
            {message.content}
          </div>
          <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-xs flex-shrink-0 mb-0.5">
            {userName ? userName.charAt(0).toUpperCase() : "U"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start px-4 py-1">
      <div className="flex items-end gap-2 max-w-[85%]">
        <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mb-0.5 border border-border shadow-sm">
          <img
            src="/dr-nisha.jpg"
            alt="Dr. Nisha"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="bg-muted text-foreground rounded-2xl rounded-bl-sm px-4 py-3 text-sm shadow-sm">
          <div className="text-xs font-semibold text-blue-500 mb-1">Dr. Nisha</div>
          <div className="prose text-current">
            <ReactMarkdown>{message.content}</ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-0.5 h-4 bg-blue-500 ml-0.5 align-middle animate-pulse" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  isStreaming?: boolean;
}

export function ChatInput({ onSend, disabled, isStreaming }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (input.trim() && !disabled && !isStreaming) {
      onSend(input.trim());
      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  return (
    <div className="relative w-full max-w-3xl mx-auto px-4 md:px-0">
      <div className="relative flex items-end w-full bg-background border border-border shadow-sm rounded-3xl focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 transition-all duration-200 overflow-hidden">
        
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Dr. Nisha about your symptoms..."
          disabled={disabled}
          className="w-full max-h-[200px] min-h-[56px] py-4 pl-6 pr-14 bg-transparent border-0 resize-none focus:outline-none focus:ring-0 text-foreground placeholder:text-muted-foreground leading-relaxed"
          rows={1}
        />
        
        <div className="absolute right-2 bottom-2">
          <button
            onClick={handleSend}
            disabled={!input.trim() || disabled || isStreaming}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200",
              input.trim() && !disabled && !isStreaming
                ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-0"
                : "bg-secondary text-muted-foreground opacity-50 cursor-not-allowed"
            )}
          >
            {isStreaming ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} className="ml-0.5" />
            )}
          </button>
        </div>
      </div>
      <div className="text-center mt-3 text-xs text-muted-foreground/70">
        Medical disclaimer: Dr. Nisha is an AI assistant. Consult a real doctor for serious concerns.
      </div>
    </div>
  );
}

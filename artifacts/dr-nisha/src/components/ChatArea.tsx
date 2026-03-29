import { useEffect, useRef } from "react";
import { useConversation, useStreamingChat } from "@/hooks/use-chat";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { EmptyState } from "./EmptyState";
import { Loader2 } from "lucide-react";
import drNishaAvatar from "@assets/WhatsApp_Image_2026-03-29_at_8.15.33_PM_1774795561459.jpeg";

interface ChatAreaProps {
  activeId: number | null;
  onCreateNew: () => void;
  isCreating: boolean;
  userName?: string | null;
}

export function ChatArea({ activeId, onCreateNew, isCreating, userName }: ChatAreaProps) {
  const { data: conversationData, isLoading } = useConversation(activeId);
  const { sendMessage, isStreaming, streamedResponse, optimisticUserMessage } = useStreamingChat(activeId);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversationData?.messages, streamedResponse, optimisticUserMessage]);

  if (!activeId) {
    return (
      <div className="flex-1 flex flex-col bg-background/50 h-full relative overflow-hidden">
        <EmptyState onCreateNew={onCreateNew} isCreating={isCreating} userName={userName} />
      </div>
    );
  }

  const messages = conversationData?.messages || [];

  return (
    <div className="flex-1 flex flex-col h-[100dvh] relative bg-background">
      
      {/* Scrollable Messages Area */}
      <div className="flex-1 overflow-y-auto w-full relative pt-20 pb-4">
        <div className="max-w-4xl mx-auto flex flex-col">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground mt-32">
              <Loader2 size={32} className="animate-spin mb-4 text-primary" />
              <p>Loading consultation...</p>
            </div>
          ) : (
            <>
              {messages.length === 0 && !optimisticUserMessage && (
                <div className="text-center mt-24 px-4">
                  <div className="w-20 h-20 mx-auto rounded-full overflow-hidden border-4 border-primary/20 shadow-lg mb-4">
                    <img src={drNishaAvatar} alt="Dr. Nisha" className="w-full h-full object-cover" />
                  </div>
                  <h3 className="text-2xl font-display font-semibold mb-2 text-foreground">How can I help you today?</h3>
                  <p className="text-muted-foreground">Describe your symptoms or ask a medical question.</p>
                </div>
              )}

              {messages.map((msg) => (
                <MessageBubble 
                  key={msg.id} 
                  role={msg.role as "user" | "model" | "assistant"} 
                  content={msg.content}
                  userName={userName}
                />
              ))}

              {optimisticUserMessage && (
                <MessageBubble 
                  role="user" 
                  content={optimisticUserMessage}
                  userName={userName}
                />
              )}

              {(isStreaming || streamedResponse) && (
                <MessageBubble 
                  role="model" 
                  content={streamedResponse || "Thinking..."}
                  isStreaming={isStreaming}
                  userName={userName}
                />
              )}
            </>
          )}
          
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Fixed Bottom Input Bar */}
      <div className="w-full bg-background border-t border-border/40 py-4 px-4 shrink-0">
        <ChatInput 
          onSend={sendMessage} 
          disabled={isLoading || !activeId} 
          isStreaming={isStreaming} 
        />
      </div>
    </div>
  );
}

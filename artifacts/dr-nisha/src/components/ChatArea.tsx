import { useEffect, useRef } from "react";
import { useConversation, useStreamingChat } from "@/hooks/use-chat";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { EmptyState } from "./EmptyState";
import { Loader2 } from "lucide-react";

interface ChatAreaProps {
  activeId: number | null;
  onCreateNew: () => void;
  isCreating: boolean;
}

export function ChatArea({ activeId, onCreateNew, isCreating }: ChatAreaProps) {
  const { data: conversationData, isLoading } = useConversation(activeId);
  const { sendMessage, isStreaming, streamedResponse, optimisticUserMessage } = useStreamingChat(activeId);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll on new messages or during stream
  useEffect(() => {
    scrollToBottom();
  }, [conversationData?.messages, streamedResponse, optimisticUserMessage]);

  if (!activeId) {
    return (
      <div className="flex-1 flex flex-col bg-background/50 h-full relative overflow-hidden">
        <EmptyState onCreateNew={onCreateNew} isCreating={isCreating} />
      </div>
    );
  }

  const messages = conversationData?.messages || [];

  return (
    <div className="flex-1 flex flex-col h-[100dvh] relative bg-background">
      
      {/* Scrollable Messages Area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto w-full relative pt-24 pb-8"
      >
        <div className="max-w-4xl mx-auto flex flex-col">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground mt-32">
              <Loader2 size={32} className="animate-spin mb-4 text-primary" />
              <p>Loading consultation...</p>
            </div>
          ) : (
            <>
              {messages.length === 0 && !optimisticUserMessage && (
                <div className="text-center mt-32">
                  <div className="inline-flex w-20 h-20 bg-primary/10 text-primary rounded-full items-center justify-center mb-6">
                    <img src={`${import.meta.env.BASE_URL}images/dr-nisha-avatar.png`} alt="Dr. Nisha" className="w-full h-full object-cover rounded-full" />
                  </div>
                  <h3 className="text-2xl font-display font-semibold mb-2">How can I help you today?</h3>
                  <p className="text-muted-foreground">Describe your symptoms or ask a medical question.</p>
                </div>
              )}

              {/* Render Historical Messages */}
              {messages.map((msg) => (
                <MessageBubble 
                  key={msg.id} 
                  role={msg.role as any} 
                  content={msg.content} 
                />
              ))}

              {/* Render Optimistic User Message */}
              {optimisticUserMessage && (
                <MessageBubble 
                  role="user" 
                  content={optimisticUserMessage} 
                />
              )}

              {/* Render Streaming AI Response */}
              {(isStreaming || streamedResponse) && (
                <MessageBubble 
                  role="model" 
                  content={streamedResponse || "Thinking..."} 
                  isStreaming={isStreaming} 
                />
              )}
            </>
          )}
          
          <div ref={messagesEndRef} className="h-10" />
        </div>
      </div>

      {/* Sticky Bottom Input Bar */}
      <div className="w-full bg-gradient-to-t from-background via-background to-transparent pt-10 pb-6 px-4 shrink-0 border-t border-border/40 backdrop-blur-md">
        <ChatInput 
          onSend={sendMessage} 
          disabled={isLoading || !activeId} 
          isStreaming={isStreaming} 
        />
      </div>
      
    </div>
  );
}

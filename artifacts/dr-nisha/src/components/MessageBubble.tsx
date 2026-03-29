import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";
import { motion } from "framer-motion";
import drNishaAvatar from "@assets/WhatsApp_Image_2026-03-29_at_8.15.33_PM_1774795561459.jpeg";

interface MessageBubbleProps {
  role: "user" | "model" | "assistant";
  content: string;
  isStreaming?: boolean;
  userName?: string | null;
}

export function MessageBubble({ role, content, isStreaming, userName }: MessageBubbleProps) {
  const isAI = role === "model" || role === "assistant";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex w-full px-4 md:px-0 py-4",
        isAI ? "justify-start" : "justify-end"
      )}
    >
      <div className={cn(
        "flex gap-3 max-w-3xl w-full",
        isAI ? "flex-row" : "flex-row-reverse"
      )}>
        
        {/* Avatar */}
        <div className="shrink-0 flex flex-col items-center">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shadow-sm overflow-hidden",
            isAI 
              ? "border-2 border-primary/20" 
              : "bg-gradient-to-br from-foreground to-foreground/80 text-background"
          )}>
            {isAI ? (
              <img 
                src={drNishaAvatar}
                alt="Dr. Nisha" 
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={20} />
            )}
          </div>
        </div>

        {/* Message Content */}
        <div className={cn(
          "flex flex-col min-w-0",
          isAI ? "items-start" : "items-end"
        )}>
          <span className="text-xs font-medium text-muted-foreground mb-1.5 px-1">
            {isAI ? "Dr. Nisha" : (userName || "You")}
          </span>
          
          <div className={cn(
            "px-5 py-4 rounded-3xl relative",
            isAI 
              ? "bg-secondary text-secondary-foreground rounded-tl-sm" 
              : "bg-primary text-primary-foreground rounded-tr-sm shadow-md shadow-primary/20"
          )}>
            {isAI ? (
              <div className="prose prose-sm md:prose-base max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
                {isStreaming && (
                  <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse rounded" />
                )}
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
                {content}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

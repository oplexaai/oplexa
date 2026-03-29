import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { User, Stethoscope } from "lucide-react";
import { motion } from "framer-motion";

interface MessageBubbleProps {
  role: "user" | "model" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export function MessageBubble({ role, content, isStreaming }: MessageBubbleProps) {
  const isAI = role === "model" || role === "assistant";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex w-full px-4 md:px-0 py-6",
        isAI ? "justify-start" : "justify-end"
      )}
    >
      <div className={cn(
        "flex gap-4 max-w-3xl w-full",
        isAI ? "flex-row" : "flex-row-reverse"
      )}>
        
        {/* Avatar */}
        <div className="shrink-0 flex flex-col items-center">
          <div className={cn(
            "w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm",
            isAI 
              ? "bg-gradient-to-br from-primary/20 to-primary/5 text-primary border border-primary/10" 
              : "bg-gradient-to-br from-foreground to-foreground/80 text-background"
          )}>
            {isAI ? (
              <img 
                src={`${import.meta.env.BASE_URL}images/dr-nisha-avatar.png`} 
                alt="Dr. Nisha" 
                className="w-full h-full object-cover rounded-2xl"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : (
              <User size={20} />
            )}
            {isAI && <Stethoscope size={20} className="hidden" />}
          </div>
        </div>

        {/* Message Content */}
        <div className={cn(
          "flex flex-col min-w-0",
          isAI ? "items-start" : "items-end"
        )}>
          <span className="text-xs font-medium text-muted-foreground mb-1.5 px-1">
            {isAI ? "Dr. Nisha" : "You"}
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
                  <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse" />
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

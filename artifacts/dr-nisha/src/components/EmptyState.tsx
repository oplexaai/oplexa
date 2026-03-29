import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import drNishaAvatar from "@assets/WhatsApp_Image_2026-03-29_at_8.15.33_PM_1774795561459.jpeg";

interface EmptyStateProps {
  onCreateNew: () => void;
  isCreating: boolean;
  userName?: string | null;
}

export function EmptyState({ onCreateNew, isCreating, userName }: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-36 h-36 md:w-44 md:h-44 mb-8 relative"
      >
        <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse" style={{ animationDuration: '3s' }} />
        <img 
          src={drNishaAvatar}
          alt="Dr. Nisha" 
          className="w-full h-full object-cover rounded-full relative z-10 shadow-xl border-4 border-white"
        />
      </motion.div>
      
      <motion.h2 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2"
      >
        {userName ? `Hello, ${userName}! 👋` : "Hello, I'm Dr. Nisha"}
      </motion.h2>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="text-sm font-medium text-primary mb-3"
      >
        MBBS, MD — Your Personal Medical AI Assistant
      </motion.p>
      
      <motion.p 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-lg text-muted-foreground max-w-lg mx-auto mb-8 leading-relaxed"
      >
        I can help answer health-related questions, check symptoms, and provide wellness guidance in English, Hindi, or Hinglish.
      </motion.p>
      
      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        onClick={onCreateNew}
        disabled={isCreating}
        className="flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-full font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-70 disabled:pointer-events-none"
      >
        <Plus size={20} />
        {isCreating ? "Starting..." : "Start a Consultation"}
      </motion.button>
    </div>
  );
}

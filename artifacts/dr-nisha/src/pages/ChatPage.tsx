import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ChatArea } from "@/components/ChatArea";
import { Menu, Activity } from "lucide-react";
import { useChatActions } from "@/hooks/use-chat";

export default function ChatPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  
  const { createConversation, isCreating } = useChatActions();

  const handleCreateNew = async () => {
    try {
      const conv = await createConversation();
      setActiveConversationId(conv.id);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      
      {/* Mobile Top Header (Fixed) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-border z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-black/5"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-xl text-primary tracking-tight">Dr. Nisha</span>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <Activity size={18} />
        </div>
      </div>

      {/* Desktop Header (Absolute floating) */}
      <div className="hidden md:flex absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-background to-transparent z-10 items-center px-8 pointer-events-none">
        {/* We add margin-left to offset the sidebar width */}
        <div className="ml-72 flex items-center gap-3 pointer-events-auto pt-4">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-md">
            <Activity size={20} />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl leading-none text-foreground">Dr. Nisha</h1>
            <p className="text-xs font-medium text-muted-foreground">Your Medical AI Assistant</p>
          </div>
        </div>
      </div>

      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
        activeId={activeConversationId}
        onSelect={(id) => setActiveConversationId(id > 0 ? id : null)}
      />
      
      <ChatArea 
        activeId={activeConversationId} 
        onCreateNew={handleCreateNew}
        isCreating={isCreating}
      />
      
    </div>
  );
}

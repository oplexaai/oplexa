import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ChatArea } from "@/components/ChatArea";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { Menu } from "lucide-react";
import { useChatActions } from "@/hooks/use-chat";
import drNishaAvatar from "@assets/WhatsApp_Image_2026-03-29_at_8.15.33_PM_1774795561459.jpeg";

export default function ChatPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [userName, setUserName] = useState<string | null>(() => {
    return localStorage.getItem("dr_nisha_user_name");
  });
  
  const { createConversation, isCreating } = useChatActions();

  const handleLogin = (name: string) => {
    setUserName(name);
    localStorage.setItem("dr_nisha_user_name", name);
  };

  const handleLogout = () => {
    setUserName(null);
    localStorage.removeItem("dr_nisha_user_name");
    setActiveConversationId(null);
  };

  const handleCreateNew = async () => {
    try {
      const conv = await createConversation("New Consultation");
      setActiveConversationId(conv.id);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      
      {/* Mobile Top Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-background/90 backdrop-blur-md border-b border-border z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-muted"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-primary/20">
              <img src={drNishaAvatar} alt="Dr. Nisha" className="w-full h-full object-cover" />
            </div>
            <span className="font-display font-bold text-xl text-foreground tracking-tight">Dr. Nisha</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DarkModeToggle />
          {userName && (
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Floating Header */}
      <div className="hidden md:flex absolute top-0 left-0 right-0 h-16 z-10 items-center px-6 justify-between pointer-events-none">
        <div className="ml-72 flex items-center gap-3 pointer-events-auto">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/20 shadow-md">
            <img src={drNishaAvatar} alt="Dr. Nisha" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg leading-none text-foreground">Dr. Nisha</h1>
            <p className="text-xs font-medium text-muted-foreground">Your Medical AI Assistant</p>
          </div>
        </div>
        {/* Dark mode toggle — top right */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <DarkModeToggle />
        </div>
      </div>

      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
        activeId={activeConversationId}
        onSelect={(id) => setActiveConversationId(id > 0 ? id : null)}
        userName={userName}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />
      
      <ChatArea 
        activeId={activeConversationId} 
        onCreateNew={handleCreateNew}
        isCreating={isCreating}
        userName={userName}
      />
    </div>
  );
}

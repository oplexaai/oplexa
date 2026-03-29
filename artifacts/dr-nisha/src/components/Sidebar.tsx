import { Plus, MessageSquare, Trash2, Menu, X, Activity } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useConversations, useChatActions } from "@/hooks/use-chat";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  activeId: number | null;
  onSelect: (id: number) => void;
}

export function Sidebar({ isOpen, setIsOpen, activeId, onSelect }: SidebarProps) {
  const { data: conversations, isLoading } = useConversations();
  const { createConversation, deleteConversation, isDeleting } = useChatActions();

  const handleNewChat = async () => {
    try {
      const newConv = await createConversation("New Consultation");
      onSelect(newConv.id);
      if (window.innerWidth < 768) setIsOpen(false);
    } catch (e) {
      console.error("Failed to create chat");
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this consultation?")) {
      await deleteConversation(id);
      if (activeId === id) {
        onSelect(0); // Assuming 0 means none selected
      }
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={cn(
        "fixed md:static inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 ease-in-out flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Activity size={20} />
            </div>
            <span className="font-display font-semibold text-lg text-sidebar-foreground tracking-tight">History</span>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:bg-black/5"
          >
            <X size={20} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-white border border-border shadow-sm text-foreground hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-medium"
          >
            <Plus size={18} className="text-primary" />
            New Consultation
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
          {isLoading ? (
            <div className="space-y-2 px-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 bg-black/5 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : conversations?.length === 0 ? (
            <div className="text-center px-4 py-8 text-sm text-muted-foreground">
              No previous consultations found.
            </div>
          ) : (
            conversations?.map((conv) => (
              <div
                key={conv.id}
                onClick={() => {
                  onSelect(conv.id);
                  if (window.innerWidth < 768) setIsOpen(false);
                }}
                className={cn(
                  "group relative w-full flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200",
                  activeId === conv.id 
                    ? "bg-primary/10 text-primary" 
                    : "text-sidebar-foreground hover:bg-black/5"
                )}
              >
                <MessageSquare size={18} className={cn(
                  "mt-0.5 shrink-0",
                  activeId === conv.id ? "text-primary" : "text-muted-foreground"
                )} />
                <div className="flex-1 min-w-0 text-left">
                  <div className="truncate font-medium text-sm">
                    {conv.title || "Consultation"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 opacity-70">
                    {format(new Date(conv.createdAt), "MMM d, yyyy")}
                  </div>
                </div>
                
                <button
                  onClick={(e) => handleDelete(e, conv.id)}
                  disabled={isDeleting}
                  className="opacity-0 group-hover:opacity-100 p-1.5 shrink-0 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all focus:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

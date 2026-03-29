"use client";

import { useState, useEffect } from "react";
import { Plus, MessageSquare, LogIn, UserPlus, LogOut, X, Trash2 } from "lucide-react";
import { LoginModal } from "./LoginModal";

interface Conversation {
  id: number;
  title: string;
  created_at: string;
}

interface Props {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  activeId: number | null;
  onSelect: (id: number) => void;
  onCreateNew: () => void;
  onDelete: (id: number) => void;
  userName: string | null;
  onLogin: (name: string) => void;
  onLogout: () => void;
}

export function Sidebar({
  isOpen,
  setIsOpen,
  activeId,
  onSelect,
  onCreateNew,
  onDelete,
  userName,
  onLogin,
  onLogout,
}: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [modal, setModal] = useState<"login" | "create" | null>(null);

  useEffect(() => {
    fetchConversations();
  }, [activeId]);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/gemini/conversations");
      if (res.ok) setConversations(await res.json());
    } catch {}
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await fetch(`/api/gemini/conversations/${id}`, { method: "DELETE" });
    onDelete(id);
    fetchConversations();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-blue-500/20">
          <img src="/dr-nisha.jpg" alt="Dr. Nisha" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-sidebar-foreground truncate">Dr. Nisha</p>
          <p className="text-xs text-muted-foreground">Medical Assistant</p>
        </div>
        {isOpen && (
          <button onClick={() => setIsOpen(false)} className="md:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Auth buttons */}
      <div className="px-3 py-3 space-y-1.5 border-b border-sidebar-border">
        {userName ? (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-xs">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-foreground truncate max-w-[110px]">{userName}</span>
            </div>
            <button onClick={onLogout} className="p-1.5 rounded-lg hover:bg-border text-muted-foreground" title="Logout">
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => setModal("login")}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-colors"
            >
              <LogIn size={15} /> Login
            </button>
            <button
              onClick={() => setModal("create")}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors"
            >
              <UserPlus size={15} /> Create Account
            </button>
          </>
        )}
      </div>

      {/* New Consultation */}
      <div className="px-3 py-3">
        <button
          onClick={() => { onCreateNew(); setIsOpen(false); }}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors"
        >
          <Plus size={16} className="text-blue-500" /> New Consultation
        </button>
      </div>

      {/* History */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {conversations.length > 0 && (
          <>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">History</p>
            <div className="space-y-0.5">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => { onSelect(conv.id); setIsOpen(false); }}
                  className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    activeId === conv.id
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <MessageSquare size={14} className="flex-shrink-0 opacity-60" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{conv.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(conv.created_at)}</p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, conv.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-border text-muted-foreground flex-shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col w-72 bg-sidebar border-r border-sidebar-border h-full flex-shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsOpen(false)} />
          <div className="relative w-72 bg-sidebar border-r border-sidebar-border h-full z-50">
            {sidebarContent}
          </div>
        </div>
      )}

      {modal && (
        <LoginModal
          mode={modal}
          onClose={() => setModal(null)}
          onSuccess={(name) => { onLogin(name); setModal(null); }}
        />
      )}
    </>
  );
}

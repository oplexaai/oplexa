"use client";

import { useState, useEffect } from "react";
import { Plus, MessageSquare, LogIn, UserPlus, LogOut, X, Trash2, Search, Pin, User } from "lucide-react";
import { LoginModal } from "./LoginModal";

interface Conversation {
  id: number;
  title: string;
  created_at: string;
}

interface UserInfo {
  username: string;
  email: string;
}

interface Props {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  activeId: number | null;
  onSelect: (id: number) => void;
  onCreateNew: () => void;
  onDelete: (id: number) => void;
  user: UserInfo | null;
  onLogin: (u: UserInfo) => void;
  onLogout: () => void;
}

export function Sidebar({ isOpen, setIsOpen, activeId, onSelect, onCreateNew, onDelete, user, onLogin, onLogout }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [modal, setModal] = useState<"login" | "create" | null>(null);
  const [search, setSearch] = useState("");
  const [pinned, setPinned] = useState<number[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("oplexa_pinned") || "[]"); } catch { return []; }
  });
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => { fetchConversations(); }, [activeId]);

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
    setPinned((prev) => prev.filter((p) => p !== id));
    fetchConversations();
  };

  const togglePin = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setPinned((prev) => {
      const next = prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id];
      localStorage.setItem("oplexa_pinned", JSON.stringify(next));
      return next;
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
  };

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );
  const pinnedConvs = filtered.filter((c) => pinned.includes(c.id));
  const unpinnedConvs = filtered.filter((c) => !pinned.includes(c.id));

  const ConvItem = ({ conv }: { conv: Conversation }) => (
    <div
      key={conv.id}
      onClick={() => { onSelect(conv.id); setIsOpen(false); }}
      className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
        activeId === conv.id
          ? "bg-red-500/10 border border-red-500/20 text-red-400"
          : "hover:bg-white/5 text-gray-400 hover:text-white"
      }`}
    >
      <MessageSquare size={13} className="flex-shrink-0 opacity-50" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{conv.title}</p>
        <p className="text-xs text-gray-700">{formatDate(conv.created_at)}</p>
      </div>
      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
        <button onClick={(e) => togglePin(e, conv.id)} className="p-1 rounded hover:bg-white/10 text-gray-600 hover:text-yellow-400">
          <Pin size={11} className={pinned.includes(conv.id) ? "fill-yellow-400 text-yellow-400" : ""} />
        </button>
        <button onClick={(e) => handleDelete(e, conv.id)} className="p-1 rounded hover:bg-white/10 text-gray-600 hover:text-red-400">
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0d0d0d]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/8">
        <div className="w-8 h-8 rounded-xl overflow-hidden">
          <img src="/oplexa-logo.png" alt="Oplexa" className="w-full h-full object-contain bg-black" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm text-white">Oplexa</p>
          <p className="text-xs text-gray-600">AI Assistant</p>
        </div>
        {isOpen && (
          <button onClick={() => setIsOpen(false)} className="md:hidden p-1.5 rounded-lg hover:bg-white/5 text-gray-600">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Auth */}
      <div className="px-3 py-3 border-b border-white/8">
        {user ? (
          <div className="space-y-1">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/8 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-red-600/20 flex items-center justify-center text-red-500 font-bold text-xs border border-red-500/20 flex-shrink-0">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.username}</p>
                <p className="text-xs text-gray-600 truncate">{user.email}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); onLogout(); }} className="p-1 rounded-lg hover:bg-white/10 text-gray-600" title="Logout">
                <LogOut size={13} />
              </button>
            </button>
            {showProfile && (
              <div className="px-3 py-2.5 rounded-xl bg-white/3 border border-white/8 space-y-1.5">
                <div className="flex items-center gap-2">
                  <User size={12} className="text-gray-600" />
                  <span className="text-xs text-gray-500">Joined {new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
                </div>
                <p className="text-xs text-gray-700">{user.email}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <button
              onClick={() => setModal("login")}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
            >
              <LogIn size={14} /> Sign In
            </button>
            <button
              onClick={() => setModal("create")}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white text-sm font-medium hover:bg-white/5 transition-colors"
            >
              <UserPlus size={14} /> Create Account
            </button>
          </div>
        )}
      </div>

      {/* New Chat */}
      <div className="px-3 py-3">
        <button
          onClick={() => { onCreateNew(); setIsOpen(false); }}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/8 text-gray-400 hover:text-white text-sm font-medium hover:bg-white/5 transition-colors"
        >
          <Plus size={15} className="text-red-500" /> New Chat
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/8">
          <Search size={13} className="text-gray-600 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-700 focus:outline-none"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {pinnedConvs.length > 0 && (
          <>
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider px-1 mb-1.5 mt-1 flex items-center gap-1">
              <Pin size={10} /> Pinned
            </p>
            <div className="space-y-0.5 mb-3">
              {pinnedConvs.map((conv) => <ConvItem key={conv.id} conv={conv} />)}
            </div>
          </>
        )}

        {unpinnedConvs.length > 0 && (
          <>
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider px-1 mb-1.5 mt-1">Recent</p>
            <div className="space-y-0.5">
              {unpinnedConvs.map((conv) => <ConvItem key={conv.id} conv={conv} />)}
            </div>
          </>
        )}

        {filtered.length === 0 && search && (
          <p className="text-center text-xs text-gray-700 mt-8">No chats found</p>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden md:flex flex-col w-72 border-r border-white/8 h-full flex-shrink-0">
        {sidebarContent}
      </div>

      {isOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setIsOpen(false)} />
          <div className="relative w-72 border-r border-white/8 h-full z-50">
            {sidebarContent}
          </div>
        </div>
      )}

      {modal && (
        <LoginModal
          mode={modal}
          onClose={() => setModal(null)}
          onSuccess={(u) => { onLogin(u); setModal(null); }}
        />
      )}
    </>
  );
}

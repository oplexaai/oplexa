"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { ChatArea } from "./ChatArea";
import { DarkModeToggle } from "./DarkModeToggle";
import { Menu, X } from "lucide-react";

interface UserInfo {
  username: string;
  email: string;
}

export default function ChatPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setUser({ username: d.user.username, email: d.user.email });
      })
      .catch(() => {})
      .finally(() => setAuthChecked(true));
  }, []);

  const handleLogin = (u: { username: string; email: string }) => {
    setUser(u);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setActiveId(null);
  };

  const handleCreateNew = async (): Promise<number | null> => {
    setIsCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/gemini/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Chat" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to start new chat.");
        return null;
      }
      setActiveId(data.id);
      return data.id;
    } catch {
      setError("Cannot connect to server. Please check your connection.");
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = (id: number) => {
    if (activeId === id) setActiveId(null);
  };

  if (!authChecked) return null;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#0a0a0a]">

      {error && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-3 flex items-center gap-3 text-sm shadow-lg">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="flex-shrink-0 hover:opacity-80">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Mobile Header */}
      <div className={`md:hidden fixed left-0 right-0 h-14 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/8 z-30 flex items-center justify-between px-4 ${error ? "top-12" : "top-0"}`}>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 rounded-lg text-gray-500 hover:bg-white/5">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <img src="/oplexa-logo.png" alt="Oplexa" className="w-6 h-6 object-contain" />
            <span className="font-bold text-base text-white">Oplexa</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DarkModeToggle />
          {user && (
            <div className="w-7 h-7 rounded-full bg-red-600/20 flex items-center justify-center text-red-500 font-bold text-xs border border-red-500/20">
              {user.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Header */}
      <div className={`hidden md:flex absolute left-0 right-0 h-14 z-10 items-center px-6 justify-between pointer-events-none ${error ? "top-12" : "top-0"}`}>
        <div className="ml-72 flex items-center gap-3 pointer-events-auto">
          <img src="/oplexa-logo.png" alt="Oplexa" className="w-8 h-8 object-contain" />
          <div>
            <h1 className="font-bold text-base leading-none text-white">Oplexa</h1>
            <p className="text-xs text-gray-600">Your AI Assistant</p>
          </div>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <DarkModeToggle />
        </div>
      </div>

      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        activeId={activeId}
        onSelect={(id) => setActiveId(id)}
        onCreateNew={async () => { await handleCreateNew(); }}
        onDelete={handleDelete}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      <ChatArea
        activeId={activeId}
        onCreateNew={handleCreateNew}
        isCreating={isCreating}
        userName={user?.username || null}
        onError={setError}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { ChatArea } from "./ChatArea";
import { DarkModeToggle } from "./DarkModeToggle";
import { Menu, AlertCircle, X } from "lucide-react";

export default function ChatPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("dr_nisha_user_name");
  });

  const handleLogin = (name: string) => {
    setUserName(name);
    localStorage.setItem("dr_nisha_user_name", name);
  };

  const handleLogout = () => {
    setUserName(null);
    localStorage.removeItem("dr_nisha_user_name");
    setActiveId(null);
  };

  const handleCreateNew = async (): Promise<number | null> => {
    setIsCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/gemini/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Consultation" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to start consultation. Check MySQL environment variables in Hostinger.");
        return null;
      }
      setActiveId(data.id);
      return data.id;
    } catch (err) {
      setError("Cannot connect to server. Please check your deployment settings.");
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = (id: number) => {
    if (activeId === id) setActiveId(null);
  };

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">

      {/* Error banner */}
      {error && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white px-4 py-3 flex items-center gap-3 text-sm shadow-lg">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="flex-shrink-0 hover:opacity-80">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Mobile Header */}
      <div className={`md:hidden fixed left-0 right-0 h-16 bg-background/90 backdrop-blur-md border-b border-border z-30 flex items-center justify-between px-4 ${error ? "top-12" : "top-0"}`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-muted"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-blue-500/20">
              <img src="/dr-nisha.jpg" alt="Dr. Nisha" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-lg text-foreground">Dr. Nisha</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DarkModeToggle />
          {userName && (
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-sm">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Header */}
      <div className={`hidden md:flex absolute left-0 right-0 h-16 z-10 items-center px-6 justify-between pointer-events-none ${error ? "top-12" : "top-0"}`}>
        <div className="ml-72 flex items-center gap-3 pointer-events-auto">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-blue-500/20 shadow-md">
            <img src="/dr-nisha.jpg" alt="Dr. Nisha" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none text-foreground">Dr. Nisha</h1>
            <p className="text-xs text-muted-foreground">Your Medical AI Assistant</p>
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
        userName={userName}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      <ChatArea
        activeId={activeId}
        onCreateNew={handleCreateNew}
        isCreating={isCreating}
        userName={userName}
        onError={setError}
      />
    </div>
  );
}

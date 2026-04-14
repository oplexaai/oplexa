"use client";

import { Plus, Zap, Globe, Brain } from "lucide-react";

interface Props {
  onStartNew: () => void;
  isCreating: boolean;
  userName?: string | null;
}

export function EmptyState({ onStartNew, isCreating, userName }: Props) {
  const suggestions = [
    "Explain quantum computing simply",
    "Python mein web scraper kaise banate hain?",
    "Write a professional email for me",
    "Mujhe ek business idea chahiye",
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 text-center">
      <div className="w-20 h-20 rounded-2xl overflow-hidden mb-6 shadow-2xl shadow-red-500/10">
        <img src="/oplexa-logo.png" alt="Oplexa" className="w-full h-full object-contain bg-black" />
      </div>

      <h1 className="text-3xl font-bold text-white mb-2">
        {userName ? `Hello, ${userName}!` : "Hello! I'm Oplexa"}
      </h1>
      <p className="text-gray-500 text-sm max-w-sm mb-8">
        Your intelligent AI assistant. Ask me anything — coding, writing, ideas, analysis, and more.
      </p>

      <div className="grid grid-cols-3 gap-3 mb-8 w-full max-w-xs">
        {[
          { icon: <Zap size={16} />, label: "Fast & Smart" },
          { icon: <Globe size={16} />, label: "Multilingual" },
          { icon: <Brain size={16} />, label: "Remembers Chat" },
        ].map((item) => (
          <div key={item.label} className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-white/5 border border-white/8">
            <span className="text-red-500">{item.icon}</span>
            <span className="text-xs text-gray-500 font-medium">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="w-full max-w-md space-y-2 mb-8">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={onStartNew}
            className="w-full text-left px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/8 border border-white/8 hover:border-red-500/30 text-gray-400 hover:text-white text-sm transition-all"
          >
            {s}
          </button>
        ))}
      </div>

      <button
        onClick={onStartNew}
        disabled={isCreating}
        className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full shadow-lg shadow-red-500/20 transition-all disabled:opacity-60"
      >
        <Plus size={18} />
        New Chat
      </button>
    </div>
  );
}

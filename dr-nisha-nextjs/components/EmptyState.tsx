"use client";

import { Plus } from "lucide-react";

interface Props {
  onStartNew: () => void;
  isCreating: boolean;
}

export function EmptyState({ onStartNew, isCreating }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 text-center">
      <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-blue-500/20 shadow-xl mb-6">
        <img
          src="/dr-nisha.jpg"
          alt="Dr. Nisha"
          className="w-full h-full object-cover"
        />
      </div>
      <h1 className="text-3xl font-bold text-foreground mb-1">
        Hello, I&apos;m Dr. Nisha
      </h1>
      <p className="text-sm font-semibold text-blue-500 mb-4">
        MBBS, MD — Your Personal Medical AI Assistant
      </p>
      <p className="text-muted-foreground text-sm max-w-sm mb-8">
        I can help answer health-related questions, check symptoms, and provide
        wellness guidance in English, Hindi, or Hinglish.
      </p>
      <button
        onClick={onStartNew}
        disabled={isCreating}
        className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-full shadow-lg transition-all disabled:opacity-60"
      >
        <Plus size={18} />
        Start a Consultation
      </button>
    </div>
  );
}

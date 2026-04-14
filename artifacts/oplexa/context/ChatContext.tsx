import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  pinned?: boolean;
}

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  setActiveConversation: (conv: Conversation | null) => void;
  createConversation: () => Conversation;
  updateConversation: (conv: Conversation) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  pinConversation: (id: string) => void;
  clearAllConversations: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);
const CONVERSATIONS_KEY = "oplexa_conversations";

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(CONVERSATIONS_KEY).then((data) => {
      if (data) {
        try {
          const parsed: Conversation[] = JSON.parse(data);
          setConversations(parsed.sort((a, b) => b.updatedAt - a.updatedAt));
        } catch {}
      }
    });
  }, []);

  const saveConversations = async (convs: Conversation[]) => {
    await AsyncStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(convs));
  };

  const createConversation = useCallback((): Conversation => {
    const now = Date.now();
    const conv: Conversation = {
      id: `conv-${now}-${Math.random().toString(36).substr(2, 9)}`,
      title: "New Chat",
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    return conv;
  }, []);

  const updateConversation = useCallback(async (conv: Conversation) => {
    setConversations((prev) => {
      const existing = prev.find((c) => c.id === conv.id);
      let updated: Conversation[];
      if (existing) {
        updated = prev.map((c) => (c.id === conv.id ? conv : c));
      } else {
        updated = [conv, ...prev];
      }
      updated = updated.sort((a, b) => b.updatedAt - a.updatedAt);
      saveConversations(updated);
      return updated;
    });
    setActiveConversation((prev) => (prev?.id === conv.id ? conv : prev));
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      saveConversations(updated);
      return updated;
    });
    setActiveConversation((prev) => (prev?.id === id ? null : prev));
  }, []);

  const pinConversation = useCallback((id: string) => {
    setConversations((prev) => {
      const updated = prev.map((c) => c.id === id ? { ...c, pinned: !c.pinned } : c);
      saveConversations(updated);
      return updated;
    });
  }, []);

  const clearAllConversations = useCallback(async () => {
    setConversations([]);
    setActiveConversation(null);
    await AsyncStorage.removeItem(CONVERSATIONS_KEY);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        setActiveConversation,
        createConversation,
        updateConversation,
        deleteConversation,
        pinConversation,
        clearAllConversations,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}

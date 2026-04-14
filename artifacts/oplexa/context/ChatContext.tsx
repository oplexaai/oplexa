import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { fetchConversations, saveConversation, deleteConversationApi, pinConversationApi } from "@/lib/conversations";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  imageUrl?: string;
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
  const { token } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const dbSyncedRef = useRef(false);

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

  useEffect(() => {
    if (!token || dbSyncedRef.current) return;
    dbSyncedRef.current = true;
    fetchConversations(token).then((dbConvs) => {
      if (dbConvs.length === 0) return;
      const synced: Conversation[] = dbConvs.map(dc => ({
        id: dc.id,
        title: dc.title,
        pinned: dc.pinned,
        createdAt: dc.createdAt,
        updatedAt: dc.updatedAt,
        messages: dc.messages.map(m => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          createdAt: m.createdAt,
        })),
      }));
      setConversations(synced);
      AsyncStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(synced));
    });
  }, [token]);

  const saveLocal = async (convs: Conversation[]) => {
    await AsyncStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(convs));
  };

  const createConversation = useCallback((): Conversation => {
    const now = Date.now();
    return {
      id: `conv-${now}-${Math.random().toString(36).substr(2, 9)}`,
      title: "New Chat",
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
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
      saveLocal(updated);
      return updated;
    });
    setActiveConversation((prev) => (prev?.id === conv.id ? conv : prev));

    if (token) {
      saveConversation(token, {
        id: conv.id,
        title: conv.title,
        pinned: conv.pinned ?? false,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        messages: conv.messages,
      });
    }
  }, [token]);

  const deleteConversation = useCallback(async (id: string) => {
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      saveLocal(updated);
      return updated;
    });
    setActiveConversation((prev) => (prev?.id === id ? null : prev));
    if (token) deleteConversationApi(token, id);
  }, [token]);

  const pinConversation = useCallback((id: string) => {
    let newPinned = false;
    setConversations((prev) => {
      const updated = prev.map((c) => {
        if (c.id === id) { newPinned = !c.pinned; return { ...c, pinned: !c.pinned }; }
        return c;
      });
      saveLocal(updated);
      return updated;
    });
    if (token) pinConversationApi(token, id, newPinned);
  }, [token]);

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

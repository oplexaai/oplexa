import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useChat, type Message } from "@/context/ChatContext";
import { streamChat, generateMessageId, type ChatMessage } from "@/lib/chat";
import { MessageBubble } from "@/components/MessageBubble";
import { TypingIndicator } from "@/components/TypingIndicator";
import { ChatInput } from "@/components/ChatInput";
import { ConversationDrawer } from "@/components/ConversationDrawer";
import { EmptyChat } from "@/components/EmptyChat";

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { activeConversation, setActiveConversation, createConversation, updateConversation } = useChat();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!user) {
      router.replace("/auth");
    }
  }, [user]);

  useEffect(() => {
    if (activeConversation && !initializedRef.current) {
      setMessages(activeConversation.messages);
      initializedRef.current = true;
    } else if (!activeConversation) {
      setMessages([]);
      initializedRef.current = false;
    }
  }, [activeConversation?.id]);

  const handleNewChat = useCallback(() => {
    setActiveConversation(null);
    setMessages([]);
    initializedRef.current = false;
    setDrawerOpen(false);
  }, [setActiveConversation]);

  const handleSend = useCallback(async (text: string) => {
    if (isStreaming) return;

    const currentMessages = [...messages];
    const userMsg: Message = {
      id: generateMessageId(),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };

    const newMessages = [...currentMessages, userMsg];
    setMessages(newMessages);
    setIsStreaming(true);
    setShowTyping(true);

    let conv = activeConversation;
    if (!conv) {
      conv = createConversation();
      setActiveConversation(conv);
    }

    const chatHistory: ChatMessage[] = newMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let fullContent = "";
    let assistantAdded = false;
    let assistantId = generateMessageId();

    try {
      await streamChat(
        chatHistory,
        (chunk) => {
          fullContent += chunk;
          if (!assistantAdded) {
            setShowTyping(false);
            setMessages((prev) => [
              ...prev,
              { id: assistantId, role: "assistant", content: fullContent, createdAt: Date.now() },
            ]);
            assistantAdded = true;
          } else {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: fullContent,
              };
              return updated;
            });
          }
        },
        undefined,
        (err) => {
          setShowTyping(false);
          const errMsg: Message = {
            id: generateMessageId(),
            role: "assistant",
            content: `Error: ${err.message}`,
            createdAt: Date.now(),
          };
          setMessages((prev) => [...prev, errMsg]);
        }
      );
    } finally {
      setIsStreaming(false);
      setShowTyping(false);

      setMessages((finalMsgs) => {
        if (conv) {
          const title = finalMsgs[0]?.content.substring(0, 60) || "New Chat";
          const updatedConv = {
            ...conv!,
            title,
            updatedAt: Date.now(),
            messages: finalMsgs,
          };
          updateConversation(updatedConv);
        }
        return finalMsgs;
      });
    }
  }, [isStreaming, messages, activeConversation, createConversation, setActiveConversation, updateConversation]);

  const reversedMessages = [...messages].reverse();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <Pressable onPress={() => setDrawerOpen(true)} style={styles.headerBtn} testID="menu-button">
          <Feather name="menu" size={22} color={colors.foreground} />
        </Pressable>
        <Pressable onPress={handleNewChat} style={styles.headerTitleArea} testID="new-chat-button">
          <Text style={[styles.headerTitle, { color: colors.primary }]}>Oplexa</Text>
        </Pressable>
        <TouchableOpacity
          onPress={() => router.push("/profile")}
          style={styles.headerBtn}
          testID="profile-button"
        >
          {user?.avatarUrl ? (
            <Image
              source={{ uri: user.avatarUrl }}
              style={styles.headerAvatar}
            />
          ) : (
            <View style={[styles.headerInitials, { backgroundColor: colors.primary }]}>
              <Text style={styles.headerInitialsText}>
                {(user?.name || "U").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        {messages.length === 0 ? (
          <EmptyChat onSuggestion={handleSend} userName={user?.name} />
        ) : (
          <FlatList
            data={reversedMessages}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <MessageBubble
                message={item}
                userName={user?.name}
                isStreaming={isStreaming && index === 0 && item.role === "assistant"}
              />
            )}
            inverted={messages.length > 0}
            ListHeaderComponent={showTyping ? <TypingIndicator /> : null}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
        <ChatInput onSend={handleSend} disabled={isStreaming} />
      </KeyboardAvoidingView>

      <ConversationDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNewChat={handleNewChat}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitleArea: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  headerInitials: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  headerInitialsText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  listContent: {
    paddingVertical: 8,
  },
});

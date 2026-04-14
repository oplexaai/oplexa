import React, { memo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Markdown from "react-native-markdown-display";
import { useColors } from "@/hooks/useColors";
import { Message } from "@/context/ChatContext";
import { useAuth } from "@/context/AuthContext";

interface Props {
  message: Message;
  userName?: string;
  isStreaming?: boolean;
}

export const MessageBubble = memo(function MessageBubble({ message, userName, isStreaming }: Props) {
  const colors = useColors();
  const { user } = useAuth();
  const isUser = message.role === "user";

  const initials = (user?.name || userName || "U")
    .split(" ")
    .map(w => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const markdownStyles = {
    body: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
    },
    strong: {
      fontWeight: "700" as const,
      color: "#ffffff",
      fontFamily: "Inter_700Bold",
    },
    em: {
      fontStyle: "italic" as const,
      color: "#e2e2e2",
      fontFamily: "Inter_400Regular",
    },
    heading1: {
      fontSize: 20,
      fontWeight: "700" as const,
      color: "#ffffff",
      marginBottom: 6,
      marginTop: 10,
      fontFamily: "Inter_700Bold",
    },
    heading2: {
      fontSize: 17,
      fontWeight: "700" as const,
      color: "#ffffff",
      marginBottom: 5,
      marginTop: 8,
      fontFamily: "Inter_700Bold",
    },
    heading3: {
      fontSize: 15,
      fontWeight: "700" as const,
      color: "#ffffff",
      marginBottom: 4,
      marginTop: 6,
      fontFamily: "Inter_700Bold",
    },
    bullet_list: { marginBottom: 8, marginTop: 4 },
    ordered_list: { marginBottom: 8, marginTop: 4 },
    list_item: { marginBottom: 4 },
    bullet_list_icon: { color: colors.primary, marginTop: 6 },
    ordered_list_icon: { color: colors.primary, fontWeight: "700" as const },
    code_inline: {
      backgroundColor: "rgba(255,255,255,0.1)",
      color: "#f87171",
      fontFamily: "monospace",
      fontSize: 13,
      borderRadius: 4,
      paddingHorizontal: 4,
    },
    fence: {
      backgroundColor: "#0d0d0d",
      borderRadius: 10,
      padding: 12,
      marginVertical: 8,
    },
    code_block: {
      backgroundColor: "#0d0d0d",
      borderRadius: 10,
      padding: 12,
      marginVertical: 8,
      fontFamily: "monospace",
      fontSize: 13,
      color: "#e5e5e5",
    },
    blockquote: {
      backgroundColor: "rgba(220,38,38,0.08)",
      borderLeftColor: colors.primary,
      borderLeftWidth: 3,
      paddingHorizontal: 12,
      paddingVertical: 4,
      marginVertical: 6,
    },
    link: { color: "#f87171" },
    paragraph: { marginBottom: 6 },
    hr: { borderTopColor: "#2a2a2a", borderTopWidth: 1, marginVertical: 10 },
    table: { borderWidth: 1, borderColor: "#2a2a2a", marginVertical: 8 },
    tr: { borderBottomWidth: 1, borderBottomColor: "#2a2a2a" },
    th: {
      backgroundColor: "#1c1c1c",
      padding: 8,
      fontWeight: "700" as const,
      color: "#ffffff",
    },
    td: { padding: 8 },
  };

  if (isUser) {
    return (
      <View style={[styles.row, styles.userRow]}>
        <View style={[styles.bubble, styles.userBubble, { backgroundColor: colors.userBubble }]}>
          {message.imageUrl && (
            <Image
              source={{ uri: message.imageUrl }}
              style={styles.msgImage}
              resizeMode="contain"
            />
          )}
          {message.content ? (
            <Text style={[styles.userText, { color: "#FFFFFF" }]}>{message.content}</Text>
          ) : null}
        </View>
        {user?.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={styles.userAvatarImg} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.row, styles.aiRow]}>
      <Image
        source={require("../assets/images/oplexa-avatar.jpg")}
        style={styles.aiAvatarImg}
      />
      <View style={[styles.bubble, styles.aiBubble, { backgroundColor: colors.aiBubble, borderColor: colors.border }]}>
        <Text style={[styles.aiLabel, { color: colors.primary }]}>Oplexa</Text>
        <Markdown style={markdownStyles}>
          {message.content + (isStreaming ? "▋" : "")}
        </Markdown>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: "flex-end",
    gap: 10,
  },
  userRow: {
    justifyContent: "flex-end",
  },
  aiRow: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "80%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  msgImage: {
    width: 220,
    height: 180,
    borderRadius: 10,
    marginBottom: 4,
  },
  userText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
  aiLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  userAvatarImg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    flexShrink: 0,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  aiAvatarImg: {
    width: 30,
    height: 30,
    borderRadius: 8,
    flexShrink: 0,
  },
});

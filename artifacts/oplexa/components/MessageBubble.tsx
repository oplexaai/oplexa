import React, { memo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
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

  if (isUser) {
    return (
      <View style={[styles.row, styles.userRow]}>
        <View style={[styles.bubble, styles.userBubble, { backgroundColor: colors.userBubble }]}>
          <Text style={[styles.text, { color: "#FFFFFF" }]}>{message.content}</Text>
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
        <Text style={[styles.text, { color: colors.foreground }]}>
          {message.content}
          {isStreaming && <Text style={{ color: colors.primary }}>▋</Text>}
        </Text>
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
  text: {
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

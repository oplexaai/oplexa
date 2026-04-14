import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Animated,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useChat, Conversation } from "@/context/ChatContext";

interface Props {
  visible: boolean;
  onClose: () => void;
  onNewChat: () => void;
}

export function ConversationDrawer({ visible, onClose, onNewChat }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { conversations, activeConversation, setActiveConversation, deleteConversation } = useChat();

  if (!visible) return null;

  const handleSelectConv = (conv: Conversation) => {
    setActiveConversation(conv);
    Haptics.selectionAsync();
    onClose();
  };

  const handleDelete = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    deleteConversation(id);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View
        style={[
          styles.drawer,
          {
            backgroundColor: colors.drawerBg,
            borderRightColor: colors.border,
            paddingTop: topPad + 16,
            paddingBottom: bottomPad + 16,
          },
        ]}
      >
        <View style={styles.drawerHeader}>
          <Image
            source={require("../assets/images/oplexa-logo-text.png")}
            style={styles.drawerLogoImg}
            resizeMode="contain"
          />
          <Pressable onPress={onNewChat} style={[styles.newBtn, { backgroundColor: colors.secondary }]}>
            <Feather name="edit" size={16} color={colors.foreground} />
          </Pressable>
        </View>

        {conversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="message-square" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No conversations yet</Text>
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            style={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelectConv(item)}
                style={({ pressed }) => [
                  styles.convItem,
                  {
                    backgroundColor:
                      activeConversation?.id === item.id
                        ? colors.primary + "20"
                        : pressed
                        ? colors.secondary
                        : "transparent",
                    borderLeftColor:
                      activeConversation?.id === item.id ? colors.primary : "transparent",
                  },
                ]}
              >
                <Feather name="message-circle" size={14} color={colors.mutedForeground} style={{ marginTop: 2 }} />
                <Text
                  style={[styles.convTitle, { color: colors.foreground }]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Pressable
                  onPress={() => handleDelete(item.id)}
                  style={styles.deleteBtn}
                  hitSlop={8}
                >
                  <Feather name="x" size={13} color={colors.mutedForeground} />
                </Pressable>
              </Pressable>
            )}
          />
        )}

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <View style={[styles.userRow, { backgroundColor: colors.secondary }]}>
            {user?.avatarUrl ? (
              <Image
                source={{ uri: user.avatarUrl }}
                style={[styles.userAvatar, { borderRadius: 16 }]}
              />
            ) : (
              <View style={[styles.userAvatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.userAvatarText}>
                  {(user?.name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>
                {user?.name || "Guest"}
              </Text>
              <Text style={[styles.userEmail, { color: colors.mutedForeground }]} numberOfLines={1}>
                {user?.email || ""}
              </Text>
            </View>
            <Pressable onPress={logout} hitSlop={8}>
              <Feather name="log-out" size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  drawerLogoImg: {
    height: 32,
    width: 150,
  },
  brandName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  newBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    flex: 1,
  },
  convItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderLeftWidth: 2,
  },
  convTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  deleteBtn: {
    padding: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    padding: 10,
  },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  userEmail: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
});

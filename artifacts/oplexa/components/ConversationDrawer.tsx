import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState, useMemo } from "react";
import {
  Image,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
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
  const { conversations, activeConversation, setActiveConversation, deleteConversation, pinConversation } = useChat();
  const [search, setSearch] = useState("");

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

  const handlePin = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    pinConversation(id);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      c => c.title.toLowerCase().includes(q) ||
        c.messages.some(m => m.content.toLowerCase().includes(q))
    );
  }, [conversations, search]);

  const sections = useMemo(() => {
    const pinned = filtered.filter(c => c.pinned);
    const unpinned = filtered.filter(c => !c.pinned);
    const result = [];
    if (pinned.length > 0) result.push({ title: "📌 Pinned", data: pinned });
    if (unpinned.length > 0) result.push({ title: "Chats", data: unpinned });
    return result;
  }, [filtered]);

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

        <View style={[styles.searchContainer, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="search" size={14} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search chats..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {conversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="message-square" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No conversations yet</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="search" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No results found</Text>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            style={styles.list}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({ section }) => (
              sections.length > 1 ? (
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                  {section.title}
                </Text>
              ) : null
            )}
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
                {item.pinned
                  ? <Text style={{ fontSize: 11, marginTop: 2 }}>📌</Text>
                  : <Feather name="message-circle" size={14} color={colors.mutedForeground} style={{ marginTop: 2 }} />
                }
                <Text
                  style={[styles.convTitle, { color: colors.foreground }]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Pressable
                  onPress={() => handlePin(item.id)}
                  style={styles.actionBtn}
                  hitSlop={8}
                >
                  <Feather
                    name="bookmark"
                    size={13}
                    color={item.pinned ? colors.primary : colors.mutedForeground}
                  />
                </Pressable>
                <Pressable
                  onPress={() => handleDelete(item.id)}
                  style={styles.actionBtn}
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
    marginBottom: 12,
  },
  drawerLogoImg: {
    height: 32,
    width: 150,
  },
  newBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  list: {
    flex: 1,
  },
  convItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderLeftWidth: 2,
  },
  convTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  actionBtn: {
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

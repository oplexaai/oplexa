import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";

function Avatar({ uri, name, size = 80 }: { uri?: string; name: string; size?: number }) {
  const colors = useColors();
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.muted }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#fff", fontSize: size * 0.38, fontFamily: "Inter_700Bold" }}>{initials}</Text>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>{title}</Text>
  );
}

function RowItem({
  icon,
  label,
  value,
  onPress,
  valueColor,
  chevron = true,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  valueColor?: string;
  chevron?: boolean;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border, backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.muted }]}>
        <Feather name={icon as any} size={16} color={colors.primary} />
      </View>
      <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
      <View style={styles.rowRight}>
        {value ? (
          <Text
            style={[styles.rowValue, { color: valueColor || colors.mutedForeground }]}
            numberOfLines={1}
          >
            {value}
          </Text>
        ) : null}
        {chevron && onPress ? (
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} style={{ marginLeft: 4 }} />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function StatBox({ value, label }: { value: string; label: string }) {
  const colors = useColors();
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function EditModal({
  visible,
  title,
  placeholder,
  value,
  onClose,
  onSave,
  multiline = false,
  keyboardType = "default",
}: {
  visible: boolean;
  title: string;
  placeholder: string;
  value: string;
  onClose: () => void;
  onSave: (val: string) => void;
  multiline?: boolean;
  keyboardType?: any;
}) {
  const colors = useColors();
  const [text, setText] = useState(value);

  React.useEffect(() => {
    if (visible) setText(value);
  }, [visible, value]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalKAV}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{title}</Text>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={placeholder}
              placeholderTextColor={colors.placeholder}
              style={[
                styles.modalInput,
                { color: colors.foreground, backgroundColor: colors.inputBg, borderColor: colors.border },
                multiline && { height: 100, textAlignVertical: "top" },
              ]}
              autoFocus
              multiline={multiline}
              keyboardType={keyboardType}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.muted }]} onPress={onClose}>
                <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={() => onSave(text)}
              >
                <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function PasswordModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (cur: string, next: string) => void }) {
  const colors = useColors();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  React.useEffect(() => {
    if (!visible) { setCur(""); setNext(""); setConfirm(""); }
  }, [visible]);

  const handleSave = () => {
    if (!cur || !next || !confirm) return Alert.alert("Error", "All fields required");
    if (next !== confirm) return Alert.alert("Error", "Passwords don't match");
    if (next.length < 6) return Alert.alert("Error", "Minimum 6 characters");
    onSave(cur, next);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalKAV}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Change Password</Text>
            {[
              { ph: "Current Password", val: cur, set: setCur },
              { ph: "New Password", val: next, set: setNext },
              { ph: "Confirm New Password", val: confirm, set: setConfirm },
            ].map(({ ph, val, set }) => (
              <TextInput
                key={ph}
                value={val}
                onChangeText={set}
                placeholder={ph}
                placeholderTextColor={colors.placeholder}
                secureTextEntry
                style={[
                  styles.modalInput,
                  { color: colors.foreground, backgroundColor: colors.inputBg, borderColor: colors.border, marginBottom: 10 },
                ]}
              />
            ))}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.muted }]} onPress={onClose}>
                <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
                <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, isLoading, logout, updateProfile, changePassword } = useAuth();
  const { conversations } = useChat();

  const [editField, setEditField] = useState<null | { title: string; key: "name" | "phone" | "bio"; placeholder: string; multiline?: boolean; keyboard?: any }>(null);
  const [showPwModal, setShowPwModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const memberYear = user?.createdAt ? new Date(user.createdAt).getFullYear() : new Date().getFullYear();
  const chatCount = conversations.length;
  const topPad = Platform.OS === "web" ? 60 : insets.top;

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo access to change your profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const mimeType = asset.mimeType || "image/jpeg";
      const dataUrl = `data:${mimeType};base64,${asset.base64}`;
      await updateProfile({ avatarUrl: dataUrl });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleSaveField = async (val: string) => {
    if (!editField) return;
    setSaving(true);
    const res = await updateProfile({ [editField.key]: val });
    setSaving(false);
    if (!res.success) {
      Alert.alert("Error", res.error);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditField(null);
    }
  };

  const handleChangePassword = async (cur: string, next: string) => {
    setSaving(true);
    const res = await changePassword(cur, next);
    setSaving(false);
    if (!res.success) {
      Alert.alert("Error", res.error);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowPwModal(false);
      Alert.alert("Success", "Password updated successfully!");
    }
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  useEffect(() => {
    if (!user && !isLoading) {
      router.replace("/auth");
    }
  }, [user, isLoading]);

  if (!user) return <View style={[styles.root, { backgroundColor: "#000" }]} />;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <View>
            <Avatar uri={user.avatarUrl} name={user.name} size={90} />
            <TouchableOpacity
              style={[styles.cameraBtn, { backgroundColor: colors.primary, borderColor: colors.background }]}
              onPress={pickAvatar}
            >
              <Feather name="camera" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={[styles.profileName, { color: colors.foreground }]}>{user.name}</Text>
          <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>{user.email}</Text>
        </View>

        <View style={[styles.statsRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <StatBox value={String(chatCount)} label="Chats" />
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <StatBox value="Oplexa 1.1" label="AI" />
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <StatBox value={String(memberYear)} label="Member" />
        </View>

        <SectionHeader title="PERSONAL INFO" />
        <View style={[styles.section, { borderColor: colors.border }]}>
          <RowItem
            icon="user"
            label="Display Name"
            value={user.name}
            onPress={() => setEditField({ title: "Display Name", key: "name", placeholder: "Enter your name" })}
          />
          <RowItem
            icon="mail"
            label="Email"
            value={user.email}
            chevron={false}
          />
          <RowItem
            icon="phone"
            label="Phone"
            value={user.phone || undefined}
            onPress={() => setEditField({ title: "Phone Number", key: "phone", placeholder: "+91 9876543210", keyboard: "phone-pad" })}
          />
          <RowItem
            icon="align-left"
            label="Bio"
            value={user.bio || "Add a bio..."}
            onPress={() => setEditField({ title: "Bio", key: "bio", placeholder: "Tell us about yourself", multiline: true })}
            chevron={!user.bio}
          />
        </View>

        <SectionHeader title="ACCOUNT" />
        <View style={[styles.section, { borderColor: colors.border }]}>
          <RowItem
            icon="lock"
            label="Change Password"
            onPress={() => setShowPwModal(true)}
          />
        </View>

        <SectionHeader title="APP" />
        <View style={[styles.section, { borderColor: colors.border }]}>
          <RowItem
            icon="cpu"
            label="AI Model"
            value="Oplexa 1.1"
            valueColor={colors.primary}
            chevron={false}
          />
          <RowItem
            icon="shield"
            label="Security"
            value="Oplexa Security"
            valueColor="#22c55e"
            chevron={false}
          />
        </View>

        <TouchableOpacity
          style={[styles.signOutBtn, { borderColor: colors.destructive }]}
          onPress={handleLogout}
        >
          <Feather name="log-out" size={17} color={colors.destructive} />
          <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign Out</Text>
        </TouchableOpacity>

        <SectionHeader title="ABOUT" />
        <View style={[styles.section, { borderColor: colors.border }]}>
          <RowItem icon="info" label="About Oplexa" value="AI Assistant v1.1" chevron={false} />
          <RowItem
            icon="mail"
            label="Contact Us"
            value="contact@oplexa.in"
            onPress={() => Linking.openURL("mailto:contact@oplexa.in")}
          />
          <RowItem
            icon="globe"
            label="Website"
            value="oplexa.in"
            onPress={() => Linking.openURL("https://oplexa.in")}
          />
        </View>

        <SectionHeader title="FOLLOW US" />
        <View style={[styles.section, { borderColor: colors.border }]}>
          {[
            { icon: "facebook", label: "Facebook", url: "https://facebook.com/oplexaai" },
            { icon: "instagram", label: "Instagram", url: "https://instagram.com/oplexaai" },
            { icon: "twitter", label: "Twitter / X", url: "https://twitter.com/oplexaai" },
            { icon: "youtube", label: "YouTube", url: "https://youtube.com/@oplexaai" },
            { icon: "linkedin", label: "LinkedIn", url: "https://linkedin.com/company/oplexaai" },
          ].map(({ icon, label, url }) => (
            <RowItem
              key={icon}
              icon={icon as any}
              label={label}
              value={`/oplexaai`}
              onPress={() => Linking.openURL(url)}
            />
          ))}
        </View>

        <View style={styles.footerCredit}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Designed & Developed by
          </Text>
          <Text style={[styles.footerBrand, { color: colors.primary }]}>Niskutech</Text>
          <Text style={[styles.footerVersion, { color: colors.mutedForeground }]}>
            Oplexa v1.1 • © 2025 Niskutech
          </Text>
        </View>
      </ScrollView>

      {editField && (
        <EditModal
          visible={true}
          title={editField.title}
          placeholder={editField.placeholder}
          value={user[editField.key] || ""}
          onClose={() => setEditField(null)}
          onSave={handleSaveField}
          multiline={editField.multiline}
          keyboardType={editField.keyboard}
        />
      )}

      <PasswordModal
        visible={showPwModal}
        onClose={() => setShowPwModal(false)}
        onSave={handleChangePassword}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  scrollContent: { paddingBottom: 48 },

  avatarSection: {
    alignItems: "center",
    paddingTop: 28,
    paddingBottom: 20,
  },
  profileName: {
    marginTop: 14,
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.4,
  },
  profileEmail: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  cameraBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },

  statsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
  },
  statValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },

  sectionHeader: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    marginHorizontal: 20,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  section: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "45%",
  },
  rowValue: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
  },

  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 24,
  },
  signOutText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  footerCredit: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  footerBrand: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  footerVersion: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalKAV: { width: "100%", alignItems: "center" },
  modalBox: {
    width: "88%",
    borderRadius: 20,
    padding: 24,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 16,
  },
  modalInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },
});

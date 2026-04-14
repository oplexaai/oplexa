import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import React, { useRef, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

interface Props {
  onSend: (text: string, imageUrl?: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const canSend = (text.trim().length > 0 || !!pendingImage) && !disabled;

  const handleSend = () => {
    if (!canSend) return;
    const msg = text.trim();
    const img = pendingImage;
    setText("");
    setPendingImage(null);
    onSend(msg, img ?? undefined);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.4,
      base64: true,
      exif: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const base64 = asset.base64;
      const mimeType = asset.mimeType || "image/jpeg";
      if (base64) {
        setPendingImage(`data:${mimeType};base64,${base64}`);
      }
    }
  };

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: bottomPad + 8 },
      ]}
    >
      {pendingImage && (
        <View style={styles.previewRow}>
          <Image source={{ uri: pendingImage }} style={styles.previewImg} resizeMode="cover" />
          <TouchableOpacity onPress={() => setPendingImage(null)} style={styles.removeBtn}>
            <Text style={styles.removeTxt}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: pendingImage ? colors.primary : colors.border }]}>
        <Pressable onPress={pickImage} disabled={disabled} style={styles.attachBtn}>
          <Feather name="paperclip" size={18} color={colors.placeholder} />
        </Pressable>
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
          placeholder="Message Oplexa..."
          placeholderTextColor={colors.placeholder}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={4000}
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          testID="chat-input"
        />
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          style={({ pressed }) => [
            styles.sendBtn,
            { backgroundColor: canSend ? colors.primary : colors.muted },
            pressed && canSend && { opacity: 0.8, transform: [{ scale: 0.95 }] },
          ]}
          testID="send-button"
        >
          <Feather name="arrow-up" size={18} color={canSend ? "#FFFFFF" : colors.mutedForeground} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  previewImg: {
    width: 52,
    height: 52,
    borderRadius: 8,
  },
  removeBtn: {
    backgroundColor: "rgba(220,38,38,0.12)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.3)",
  },
  removeTxt: {
    color: "#f87171",
    fontSize: 13,
    fontWeight: "600",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 24,
    borderWidth: 1,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
  },
  attachBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginBottom: 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    maxHeight: 120,
    paddingTop: 4,
    paddingBottom: 4,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});

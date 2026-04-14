import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);
  const canSend = text.trim().length > 0 && !disabled;

  const handleSend = () => {
    if (!canSend) return;
    const msg = text.trim();
    setText("");
    onSend(msg);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: bottomPad + 8 },
      ]}
    >
      <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
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
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 24,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
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

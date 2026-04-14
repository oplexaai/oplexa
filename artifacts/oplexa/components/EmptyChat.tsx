import { Feather } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

const SUGGESTIONS = [
  "Explain quantum computing simply",
  "Write a Python web scraper",
  "Plan a 7-day trip to Japan",
  "Help me write a cover letter",
];

interface Props {
  onSuggestion: (text: string) => void;
  userName?: string;
}

export function EmptyChat({ onSuggestion, userName }: Props) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/images/oplexa-logo.jpg")}
        style={styles.logo}
        resizeMode="cover"
      />
      <Text style={[styles.greeting, { color: colors.foreground }]}>
        {userName ? `Hello, ${userName.split(" ")[0]}` : "Hello"}
      </Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        How can I help you today?
      </Text>
      <View style={styles.suggestions}>
        {SUGGESTIONS.map((s) => (
          <View
            key={s}
            style={[styles.suggestionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name="zap" size={13} color={colors.primary} />
            <Text
              style={[styles.suggestionText, { color: colors.foreground }]}
              onPress={() => onSuggestion(s)}
            >
              {s}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 18,
    marginBottom: 20,
    overflow: "hidden",
  },
  greeting: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    marginBottom: 32,
  },
  suggestions: {
    width: "100%",
    gap: 10,
  },
  suggestionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
});

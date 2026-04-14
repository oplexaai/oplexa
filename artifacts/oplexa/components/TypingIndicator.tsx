import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export function TypingIndicator() {
  const colors = useColors();
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      );

    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 200);
    const a3 = animate(dot3, 400);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
  });

  return (
    <View style={[styles.row]}>
      <View style={[styles.aiAvatar, { backgroundColor: "#1A0000", borderColor: colors.primary + "40" }]}>
        <Animated.Text style={[styles.aiAvatarText, { color: colors.primary }, dotStyle(dot1)]}>O</Animated.Text>
      </View>
      <View style={[styles.bubble, { backgroundColor: colors.aiBubble, borderColor: colors.border }]}>
        <View style={styles.dots}>
          {[dot1, dot2, dot3].map((dot, i) => (
            <Animated.View
              key={i}
              style={[styles.dot, { backgroundColor: colors.primary }, dotStyle(dot)]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: "flex-end",
    gap: 10,
  },
  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  aiAvatarText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  bubble: {
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});

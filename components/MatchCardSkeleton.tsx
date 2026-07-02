import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useAppContext } from "@/context/AppContext";

// Pulsing placeholder shaped like a MatchHistory match card, shown while the
// match list is loading so the screen isn't blank.
const MatchCardSkeleton = () => {
  const { currentTheme } = useAppContext();
  const isDark = currentTheme === "dark";
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const cardColor = isDark ? "#1e2a36" : "#f0f0f0";
  const barColor = isDark ? "#33475a" : "#dcdcdc";

  return (
    <View style={[styles.card, { backgroundColor: cardColor }]}>
      <View style={styles.headerRow}>
        <Animated.View
          style={[styles.titleBar, { backgroundColor: barColor, opacity: pulse }]}
        />
        <Animated.View
          style={[styles.badge, { backgroundColor: barColor, opacity: pulse }]}
        />
      </View>
      <Animated.View
        style={[styles.line, { backgroundColor: barColor, opacity: pulse }]}
      />
      <Animated.View
        style={[styles.lineShort, { backgroundColor: barColor, opacity: pulse }]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  titleBar: {
    width: "50%",
    height: 20,
    borderRadius: 6,
  },
  badge: {
    width: 64,
    height: 20,
    borderRadius: 10,
  },
  line: {
    width: "80%",
    height: 14,
    borderRadius: 6,
    marginBottom: 10,
  },
  lineShort: {
    width: "55%",
    height: 14,
    borderRadius: 6,
  },
});

export default MatchCardSkeleton;

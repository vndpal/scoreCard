import React, { useEffect } from "react";
import {
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  SlideInLeft,
  SlideOutRight,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { AUTO_DISMISS_MS, useCelebration } from "@/context/CelebrationContext";
import { useAppContext } from "@/context/AppContext";
import { CelebrationEvent, CELEBRATION_META } from "@/types/celebration";

// The overlay is mounted at the app root (a sibling of the router Stack), so it
// is above the navigator's safe-area provider — useSafeAreaInsets would throw
// here. Use a status-bar-aware constant to clear the notch instead. Sitting
// just below the status bar keeps the whole scoring UI visible and tappable.
const TOP_OFFSET =
  (Platform.OS === "android" ? StatusBar.currentHeight ?? 24 : 47) + 8;

// One continuous left-to-right pass: spring in from the left edge, pause for
// the countdown, slide out through the right edge (also used on tap-dismiss).
const ENTER = SlideInLeft.springify().damping(19).stiffness(210).mass(0.8);
const EXIT = SlideOutRight.duration(240).easing(Easing.in(Easing.cubic));

type ToastProps = {
  event: CelebrationEvent;
  dark: boolean;
  onDismiss: () => void;
};

const Toast = ({ event, dark, onDismiss }: ToastProps) => {
  const meta = CELEBRATION_META[event.type];
  const accent = dark ? meta.accent.dark : meta.accent.light;
  const theme = dark ? darkStyles : lightStyles;

  // Depleting countdown mirroring the context's auto-dismiss timer.
  const remaining = useSharedValue(1);

  // Mount-only: the overlay keys this component on event.id, so each milestone
  // gets a fresh instance — countdown restarts and haptics fire per toast.
  useEffect(() => {
    remaining.value = withTiming(0, {
      duration: AUTO_DISMISS_MS,
      easing: Easing.linear,
    });
    try {
      Haptics.impactAsync(
        meta.haptic === "heavy"
          ? Haptics.ImpactFeedbackStyle.Heavy
          : Haptics.ImpactFeedbackStyle.Medium
      ).catch(() => {});
    } catch {
      // Haptics unsupported on this device/platform — ignore.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const barStyle = useAnimatedStyle(() => ({
    width: `${remaining.value * 100}%`,
  }));

  return (
    <Pressable
      onPress={onDismiss}
      accessibilityRole="button"
      accessibilityLabel={`${event.title}${
        event.subtitle ? `, ${event.subtitle}` : ""
      }. Tap to dismiss`}
      style={({ pressed }) => [
        styles.banner,
        theme.banner,
        pressed && styles.bannerPressed,
      ]}
    >
      <View style={[styles.accentStrip, { backgroundColor: accent }]} />
      <View
        style={[
          styles.iconChip,
          // 8-digit hex: accent at ~10% (light) / ~15% (dark) for the tint.
          { backgroundColor: accent + (dark ? "26" : "1A") },
        ]}
      >
        <Text style={styles.emoji}>{meta.emoji}</Text>
      </View>
      <View style={styles.textCol}>
        <Text style={[styles.kicker, { color: accent }]}>
          {meta.kicker.toUpperCase()}
        </Text>
        <Text style={[styles.title, theme.title]} numberOfLines={1}>
          {event.title}
        </Text>
        {event.subtitle ? (
          <Text style={[styles.subtitle, theme.subtitle]} numberOfLines={1}>
            {event.subtitle}
          </Text>
        ) : null}
      </View>
      <Ionicons
        name="close"
        size={16}
        color={dark ? "#64748B" : "#9AA3B2"}
        style={styles.close}
      />
      <View style={styles.progressTrack}>
        <Animated.View
          style={[styles.progressFill, { backgroundColor: accent }, barStyle]}
        />
      </View>
    </Pressable>
  );
};

const CelebrationOverlay = () => {
  const { active, dismiss } = useCelebration();
  const { currentTheme } = useAppContext();

  // Idle: render nothing (zero cost, no touch capture).
  if (!active) return null;

  return (
    // Keyed on the milestone id: advancing the queue exits the old toast to the
    // right while the next one springs in from the left. box-none lets touches
    // outside the banner fall through to the scoring UI.
    <Animated.View
      key={active.id}
      entering={ENTER}
      exiting={EXIT}
      pointerEvents="box-none"
      style={styles.root}
    >
      <Toast
        event={active}
        dark={currentTheme === "dark"}
        onDismiss={dismiss}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: TOP_OFFSET,
    left: 16,
    right: 16,
    zIndex: 1000,
    alignItems: "center",
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    maxWidth: 420,
    minHeight: 64,
    borderRadius: 16,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 14,
    overflow: "hidden",
  },
  bannerPressed: {
    opacity: 0.92,
  },
  accentStrip: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  emoji: {
    fontSize: 20,
    lineHeight: 26,
    textAlign: "center",
  },
  textCol: {
    flex: 1,
    paddingVertical: 11,
  },
  kicker: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 1,
  },
  close: {
    marginLeft: 8,
  },
  progressTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: "rgba(148,163,184,0.18)",
  },
  progressFill: {
    height: "100%",
  },
});

const lightStyles = StyleSheet.create({
  banner: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E7EBF1",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    color: "#151A21",
  },
  subtitle: {
    color: "#5A6675",
  },
});

const darkStyles = StyleSheet.create({
  banner: {
    backgroundColor: "#1E293B",
    borderColor: "rgba(255,255,255,0.10)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    color: "#F8FAFC",
  },
  subtitle: {
    color: "#94A3B8",
  },
});

export default CelebrationOverlay;

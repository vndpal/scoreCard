// Celebrations are a delight-only feature: a slide-in toast that fires on
// cricket milestones during scoring. Kept fully self-contained so it never
// touches the core scoring/stats data model.

type CelebrationType =
  | "fifty"
  | "century"
  | "hatTrick"
  | "maiden"
  | "team100"
  | "sixSixes";

type CelebrationEvent = {
  id: string; // unique per fire, used as the queue/render key
  type: CelebrationType;
  title: string; // e.g. "Century!"
  subtitle?: string; // e.g. "Rahul · 58 balls · 8×4 2×6"
  emoji: string; // e.g. "💯"
};

// Haptic strength requested for a milestone. Mapped to expo-haptics inside the
// overlay so this file stays dependency-free (and unit-testable).
type CelebrationHaptic = "medium" | "heavy";

type CelebrationMeta = {
  emoji: string;
  // Small uppercase eyebrow above the title (e.g. "Batting Milestone").
  kicker: string;
  // One saturated accent per theme — drives the toast's edge strip, icon-chip
  // tint, kicker text and countdown bar. Light mode needs the darker shade to
  // read on white; dark mode needs the brighter one to pop on slate.
  accent: { light: string; dark: string };
  haptic: CelebrationHaptic;
};

// Single source of truth for a milestone's look + feel. Used by the detector
// (emoji) and the toast overlay (kicker/accent/haptic).
const CELEBRATION_META: Record<CelebrationType, CelebrationMeta> = {
  fifty: {
    emoji: "🏏",
    kicker: "Batting Milestone",
    accent: { light: "#0D9488", dark: "#2DD4BF" },
    haptic: "medium",
  },
  century: {
    emoji: "💯",
    kicker: "Batting Milestone",
    accent: { light: "#D97706", dark: "#FBBF24" },
    haptic: "heavy",
  },
  hatTrick: {
    emoji: "🎩",
    kicker: "Bowling Milestone",
    accent: { light: "#7C3AED", dark: "#A78BFA" },
    haptic: "heavy",
  },
  maiden: {
    emoji: "🎯",
    kicker: "Bowling Milestone",
    accent: { light: "#16A34A", dark: "#4ADE80" },
    haptic: "medium",
  },
  team100: {
    emoji: "🚩",
    kicker: "Team Milestone",
    accent: { light: "#2F6BEA", dark: "#60A5FA" },
    haptic: "medium",
  },
  sixSixes: {
    emoji: "🚀",
    kicker: "Record Over",
    accent: { light: "#E11D48", dark: "#FB7185" },
    haptic: "heavy",
  },
};

export type {
  CelebrationType,
  CelebrationEvent,
  CelebrationHaptic,
  CelebrationMeta,
};
export { CELEBRATION_META };

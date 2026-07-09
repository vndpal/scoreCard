import React, { useEffect } from "react";
import { Dimensions, StyleSheet } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Modest particle count — enough to feel festive, cheap enough to stay smooth
// even on the scoring screen.
const PIECE_COUNT = 22;

type Shape = "rect" | "streamer" | "circle";

// Per-shape footprint, derived from the piece's base size. Mixing shapes reads
// far richer than a field of identical rectangles.
const shapeStyle = (shape: Shape, size: number) => {
  switch (shape) {
    case "streamer":
      return { width: size * 0.4, height: size * 1.9, borderRadius: size * 0.2 };
    case "circle":
      return { width: size * 0.85, height: size * 0.85, borderRadius: size };
    default:
      return { width: size, height: size * 0.6, borderRadius: size * 0.15 };
  }
};

type PieceProps = {
  color: string;
  startX: number;
  size: number;
  shape: Shape;
  opacity: number;
  delay: number;
  fallDuration: number;
  rotateDuration: number;
  sway: number;
};

const ConfettiPiece = ({
  color,
  startX,
  size,
  shape,
  opacity,
  delay,
  fallDuration,
  rotateDuration,
  sway,
}: PieceProps) => {
  const translateY = useSharedValue(-40);
  const rotate = useSharedValue(0);
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withTiming(SCREEN_HEIGHT + 60, {
          duration: fallDuration,
          easing: Easing.linear,
        }),
        -1,
        false
      )
    );
    rotate.value = withRepeat(
      withTiming(360, { duration: rotateDuration, easing: Easing.linear }),
      -1,
      false
    );
    translateX.value = withRepeat(
      withSequence(
        withTiming(sway, { duration: fallDuration / 4 }),
        withTiming(-sway, { duration: fallDuration / 2 }),
        withTiming(0, { duration: fallDuration / 4 })
      ),
      -1,
      false
    );
    // Run once on mount; the piece animates for the overlay's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          left: startX,
          backgroundColor: color,
          opacity,
          ...shapeStyle(shape, size),
        },
        style,
      ]}
    />
  );
};

const SHAPES: Shape[] = ["rect", "streamer", "circle"];

const rand = (min: number, max: number) => min + Math.random() * (max - min);

const Confetti = ({ colors }: { colors: string[] }) => {
  // Build the piece configs once per mount (per milestone).
  const pieces = React.useMemo(
    () =>
      Array.from({ length: PIECE_COUNT }).map((_, i) => ({
        key: i,
        color: colors[i % colors.length],
        shape: SHAPES[i % SHAPES.length],
        startX: rand(0, SCREEN_WIDTH - 12),
        size: rand(8, 15),
        opacity: rand(0.85, 1),
        delay: rand(0, 900),
        fallDuration: rand(2200, 3600),
        rotateDuration: rand(700, 1500),
        sway: rand(15, 45),
      })),
    // colors is a stable literal per milestone type; remount handles changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map(({ key, ...p }) => (
        <ConfettiPiece key={key} {...p} />
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  piece: {
    position: "absolute",
    top: 0,
  },
});

export default Confetti;

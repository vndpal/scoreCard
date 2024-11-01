import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { Timestamp } from "@react-native-firebase/firestore";

type MatchTimerProps = {
  matchStartDateTime: Timestamp;
  lastActivityDateTime: Timestamp;
  thresholdIdleTime: number;
};

const MatchTimer = ({
  matchStartDateTime,
  lastActivityDateTime,
  thresholdIdleTime,
}: MatchTimerProps) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isInactive, setIsInactive] = useState(false);
  const { currentTheme } = useTheme();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  useEffect(() => {
    const matchStartTime = matchStartDateTime.toMillis();
    const lastActivityTime = lastActivityDateTime.toMillis();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const elapsed = now - matchStartTime;
      setElapsedTime(elapsed);

      // Check if more than thresholdIdleTime have passed since last activity
      setIsInactive(now - lastActivityTime > thresholdIdleTime);
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [matchStartDateTime, lastActivityDateTime, thresholdIdleTime]);

  const formatElapsedTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return [hours, minutes, remainingSeconds]
      .map((v) => v.toString().padStart(2, "0"))
      .join(":");
  };

  return (
    <View
      style={[
        styles.container,
        themeStyles.container,
        isInactive && styles.inactiveContainer,
      ]}
    >
      <Text
        style={[
          styles.timeText,
          themeStyles.timeText,
          isInactive && styles.inactiveTimeText,
        ]}
      >
        Match Time: {formatElapsedTime(elapsedTime)}
      </Text>
      {isInactive && (
        <Text style={[styles.inactiveText, themeStyles.inactiveText]}>
          Don't waste time, play faster!
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  timeText: {
    fontSize: 16,
    fontWeight: "600",
  },
  inactiveContainer: {
    backgroundColor: "red",
  },
  inactiveText: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  inactiveTimeText: {
    color: "#fff",
  },
});

const lightStyles = StyleSheet.create({
  container: {
    backgroundColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timeText: {
    color: "#333",
  },
  inactiveText: {
    color: "#fff",
  },
});

const darkStyles = StyleSheet.create({
  container: {
    backgroundColor: "#2c2c2c",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  timeText: {
    color: "#fff",
  },
  inactiveText: {
    color: "#fff",
  },
});

export default MatchTimer;

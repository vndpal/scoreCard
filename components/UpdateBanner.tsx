import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";

interface UpdateBannerProps {
  isVisible: boolean;
  onUpdate: () => void;
  isDownloading?: boolean;
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({
  isVisible,
  onUpdate,
  isDownloading = false,
}) => {
  const theme = useTheme();

  if (!isVisible) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.primary },
      ]}
    >
      <View style={styles.content}>
        <Text style={[styles.message, { color: theme.colors.onPrimary }]}>
          New update available! Tap to install.
        </Text>
      </View>
      <TouchableOpacity
        onPress={onUpdate}
        disabled={isDownloading}
        style={[
          styles.button,
          {
            backgroundColor: theme.colors.onPrimary,
            opacity: isDownloading ? 0.6 : 1,
          },
        ]}
      >
        <Text
          style={[
            styles.buttonText,
            { color: theme.colors.primary },
          ]}
        >
          {isDownloading ? "Installing..." : "Update"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  content: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontWeight: "500",
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  buttonText: {
    fontWeight: "600",
    fontSize: 12,
  },
});

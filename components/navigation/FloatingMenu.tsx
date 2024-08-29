import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  TouchableOpacity,
  View,
  useColorScheme,
  Text,
  StyleSheet,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";

export const FloatingMenu: React.FC = () => {
  const router = useRouter();
  const { toggleTheme, currentTheme } = useTheme();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  const [isMenuVisible, setIsMenuVisible] = useState(false);

  const toggleMenu = () => {
    setIsMenuVisible(!isMenuVisible);
  };

  const handleLinkPress = (route: string) => {
    toggleMenu();
    router.push(route);
  };

  const changeTheme = () => {
    toggleTheme();
  };

  return (
    <View>
      <TouchableOpacity
        style={[styles.menuButton, themeStyles.menuButton]}
        onPress={toggleMenu}
      >
        {isMenuVisible ? (
          <Ionicons name="close" size={24} color="white" />
        ) : (
          <Ionicons name="add" size={24} color="white" />
        )}
      </TouchableOpacity>
      {isMenuVisible && (
        <View style={[styles.menuOptions, themeStyles.menuOptions]}>
          <TouchableOpacity onPress={() => handleLinkPress("createMatch")}>
            <Text style={[styles.menuOptionText, themeStyles.menuOptionText]}>
              🏏 New match
            </Text>
          </TouchableOpacity>
          <View style={[styles.horizontalLine, themeStyles.horizontalLine]} />
          <TouchableOpacity onPress={() => handleLinkPress("toss")}>
            <Text style={[styles.menuOptionText, themeStyles.menuOptionText]}>
              🪙 Toss
            </Text>
          </TouchableOpacity>
          <View style={[styles.horizontalLine, themeStyles.horizontalLine]} />
          <TouchableOpacity onPress={() => handleLinkPress("teamLineup")}>
            <Text style={[styles.menuOptionText, themeStyles.menuOptionText]}>
              📋 Team setup
            </Text>
          </TouchableOpacity>
          <View style={[styles.horizontalLine, themeStyles.horizontalLine]} />
          <TouchableOpacity onPress={() => handleLinkPress("createTeam")}>
            <Text style={[styles.menuOptionText, themeStyles.menuOptionText]}>
              🙌 New team
            </Text>
          </TouchableOpacity>
          <View style={[styles.horizontalLine, themeStyles.horizontalLine]} />
          <TouchableOpacity onPress={() => handleLinkPress("players")}>
            <Text style={[styles.menuOptionText, themeStyles.menuOptionText]}>
              👦 Players
            </Text>
          </TouchableOpacity>
          <View style={[styles.horizontalLine, themeStyles.horizontalLine]} />
          <TouchableOpacity onPress={() => handleLinkPress("playerRecords")}>
            <Text style={[styles.menuOptionText, themeStyles.menuOptionText]}>
              📈 Stats
            </Text>
          </TouchableOpacity>
          <View style={[styles.horizontalLine, themeStyles.horizontalLine]} />
          <TouchableOpacity onPress={changeTheme}>
            <Text style={[styles.menuOptionText, themeStyles.menuOptionText]}>
              {currentTheme === "dark" ? "🌙" : "☀️"} Change theme
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  menuButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuOptions: {
    position: "absolute",
    bottom: 90,
    right: 20,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: "#eee",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuOptionText: {
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  horizontalLine: {
    borderBottomWidth: 1,
    marginVertical: 4,
  },
});

const darkStyles = StyleSheet.create({
  menuButton: {
    backgroundColor: "#00C4B4",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 10,
  },
  menuOptions: {
    backgroundColor: "#6C8E6F", // Lighter background color
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 }, // Minimal shadow offset
    shadowOpacity: 0.5, // Increased shadow intensity for better visibility
    shadowRadius: 8, // Moderate shadow blur
    elevation: 4, // Moderate elevation
    borderRadius: 8, // Rounded corners
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  menuOptionText: {
    color: "#E0E0E0", // Darker text color for high contrast
    fontWeight: "500",
  },
  horizontalLine: {
    borderBottomColor: "#666", // Medium gray for better visibility
  },
});

const lightStyles = StyleSheet.create({
  menuButton: {
    backgroundColor: "#8E24AA",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 10,
  },
  menuOptions: {
    backgroundColor: "#E5E5FF", // Light background color
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 }, // Minimal shadow offset
    shadowOpacity: 0.3, // Light shadow intensity
    shadowRadius: 8, // Moderate shadow blur
    elevation: 2, // Low elevation
    borderRadius: 8, // Rounded corners
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  menuOptionText: {
    color: "#003366", // Bright blue text color for a standout look
    fontWeight: "500",
  },
  horizontalLine: {
    borderBottomColor: "#BBBBBB", // Darker gray for clearer separation
  },
});

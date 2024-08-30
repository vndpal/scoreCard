import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";

export const FloatingMenu: React.FC = () => {
  const router = useRouter();
  const { toggleTheme, currentTheme } = useTheme();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [animation] = useState(new Animated.Value(0));

  const toggleMenu = () => {
    setIsMenuVisible(!isMenuVisible);
    Animated.timing(animation, {
      toValue: isMenuVisible ? 0 : 1,
      duration: 300,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start();
  };

  const handleLinkPress = (route: string) => {
    toggleMenu();
    router.push(route);
  };

  const changeTheme = () => {
    toggleTheme();
  };

  const menuOptionsStyle = {
    opacity: animation,
    transform: [
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [50, 0],
        }),
      },
    ],
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.menuButton, themeStyles.menuButton]}
        onPress={toggleMenu}
      >
        <Animated.View
          style={{
            transform: [
              {
                rotate: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", "45deg"],
                }),
              },
            ],
          }}
        >
          <Ionicons name="add" size={24} color="white" />
        </Animated.View>
      </TouchableOpacity>
      {isMenuVisible && (
        <Animated.View
          style={[
            styles.menuOptions,
            themeStyles.menuOptions,
            menuOptionsStyle,
          ]}
        >
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
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 20,
    right: 20,
  },
  menuButton: {
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
    bottom: 70,
    right: 0,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 180,
  },
  menuOptionText: {
    fontSize: 16,
    paddingVertical: 8,
  },
  horizontalLine: {
    borderBottomWidth: 1,
    marginVertical: 4,
  },
});

const darkStyles = StyleSheet.create({
  menuButton: {
    backgroundColor: "#00C4B4",
  },
  menuOptions: {
    backgroundColor: "#2C2C2C",
  },
  menuOptionText: {
    color: "#FFFFFF",
  },
  horizontalLine: {
    borderBottomColor: "#444444",
  },
});

const lightStyles = StyleSheet.create({
  menuButton: {
    backgroundColor: "#8E24AA",
  },
  menuOptions: {
    backgroundColor: "#FFFFFF",
  },
  menuOptionText: {
    color: "#333333",
  },
  horizontalLine: {
    borderBottomColor: "#EEEEEE",
  },
});

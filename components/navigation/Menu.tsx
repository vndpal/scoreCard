import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  View,
  TouchableWithoutFeedback,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Platform,
  StatusBar,
  Alert,
} from "react-native";
import { Text, Portal } from "react-native-paper";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

interface MenuProps {
  visible: boolean;
  hideMenu: () => void;
}

const menuItems = [
  { id: "1", title: "🏏 New match", route: "/createMatch" },
  { id: "2", title: "🪙 Toss", route: "/toss" },
  { id: "3", title: "📝 Team setup", route: "/teamLineup" },
  { id: "4", title: "🙌 New team", route: "/createTeam" },
  { id: "5", title: "👦 Players", route: "/players" },
  { id: "6", title: "📊 Stats", route: "/playerRecords" },
  { id: "7", title: "⚙️ Settings", route: "/settings" },
];
const Menu: React.FC<MenuProps> = ({ visible, hideMenu }) => {
  const slideAnim = useRef(new Animated.Value(width * 0.7)).current;
  const router = useRouter();
  const { currentTheme, toggleTheme } = useTheme();
  const [group, setGroup] = useState<string | null>(null);

  useEffect(() => {
    const getGroup = async () => {
      const group = await AsyncStorage.getItem("userClub");
      setGroup(group);
    };
    getGroup();
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : width * 0.7,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  const handleLinkPress = (route: string) => {
    hideMenu();
    router.push(route);
  };

  const changeTheme = () => {
    toggleTheme();
  };

  const exitClub = async () => {
    Alert.alert("Leave Group", "Are you sure you want to leave this group?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("userClub");
          router.replace("/club");
        },
      },
    ]);
  };

  if (!visible) return null;

  return (
    <View
      style={[
        styles.modalContainer,
        { marginTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 },
      ]}
    >
      <TouchableWithoutFeedback onPress={hideMenu}>
        <View style={[styles.overlay, themeStyles.overlay]} />
      </TouchableWithoutFeedback>
      <Animated.View
        style={[
          styles.modal,
          themeStyles.modal,
          { transform: [{ translateX: slideAnim }] },
        ]}
      >
        <View style={styles.menuContent}>
          <View style={[styles.header, themeStyles.header]}>
            <View style={styles.profileSection}>
              <Ionicons
                name="person-circle"
                size={40}
                color={themeStyles.text.color}
              />
              <Text style={[styles.headerText, themeStyles.headerText]}>
                {group}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={hideMenu}>
              <Ionicons
                name="close-circle"
                size={24}
                color={themeStyles.text.color}
              />
            </TouchableOpacity>
          </View>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, themeStyles.menuItem]}
              onPress={() => handleLinkPress(item.route)}
            >
              <Text style={[styles.menuOptionText, themeStyles.menuOptionText]}>
                {item.title}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={themeStyles.text.color}
              />
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.menuItem, themeStyles.menuItem]}
            onPress={exitClub}
          >
            <Text style={[styles.menuOptionText, themeStyles.menuOptionText]}>
              🚶‍♂️ Leave Group
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, themeStyles.menuItem]}
            onPress={changeTheme}
          >
            <Text style={[styles.menuOptionText, themeStyles.menuOptionText]}>
              {currentTheme === "dark" ? "🌙 Dark Mode" : "☀️ Light Mode"}
            </Text>
            <View style={[styles.switch, themeStyles.switch]}>
              <View
                style={[
                  styles.switchKnob,
                  themeStyles.switchKnob,
                  currentTheme === "dark" && styles.switchKnobActive,
                ]}
              />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, themeStyles.menuItem]}
            onPress={hideMenu}
          >
            <Text style={[styles.menuOptionText, themeStyles.menuOptionText]}>
              ← Close Menu
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modal: {
    position: "absolute",
    right: 0, // Change from left: 0 to right: 0
    top: 0,
    bottom: 0,
    width: width * 0.7,
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
    borderTopRightRadius: 20, // Change from borderTopLeftRadius
    borderBottomRightRadius: 20, // Change from borderBottomLeftRadius
  },
  menuContent: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
  },
  headerText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 8,
    paddingLeft: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    marginBottom: 8,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  menuOptionText: {
    fontSize: 18,
  },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
  },
  switchKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  switchKnobActive: {
    transform: [{ translateX: 22 }],
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});

const darkStyles = StyleSheet.create({
  overlay: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modal: {
    backgroundColor: "#1E1E1E",
  },
  header: {
    borderBottomColor: "rgba(255, 255, 255, 0.2)",
  },
  headerText: {
    color: "#FFFFFF",
  },
  menuItem: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  menuOptionText: {
    color: "#FFFFFF",
  },
  text: {
    color: "#FFFFFF",
  },
  switch: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  switchKnob: {
    backgroundColor: "#FFFFFF",
  },
});

const lightStyles = StyleSheet.create({
  overlay: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  modal: {
    backgroundColor: "#FFFFFF",
  },
  header: {
    borderBottomColor: "rgba(0, 0, 0, 0.2)",
  },
  headerText: {
    color: "#333333",
  },
  menuItem: {
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  menuOptionText: {
    color: "#333333",
  },
  text: {
    color: "#333333",
  },
  switch: {
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  switchKnob: {
    backgroundColor: "#333333",
  },
});

export default Menu;

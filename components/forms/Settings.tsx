import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import TimePicker from "@/components/ui/timePicker";
import { updateSettings } from "@/utils/updateSettings";
import { getItem } from "@/utils/asyncStorage";
import { STORAGE_ITEMS } from "@/constants/StorageItems";
import { firestoreService } from "@/firebase/services/firestore";
import Loader from "../Loader";
import { toggleCache } from "@/firebase";

const Settings = () => {
  const { currentTheme, toggleTheme, currentSettings, applySettingsChanges } =
    useTheme();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [showMatchTimer, setShowMatchTimer] = useState(false);
  const [matchTime, setMatchTime] = useState({
    hours: 0,
    minutes: 0,
    seconds: 30,
  });
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setNotifications(currentSettings.notifications);
      setShowMatchTimer(currentSettings.showMatchTimer);
      setAutoUpdate(currentSettings.autoUpdate);
      setMatchTime({
        hours: currentSettings?.matchTime?.hours || 0,
        minutes: currentSettings?.matchTime?.minutes || 0,
        seconds: currentSettings?.matchTime?.seconds || 0,
      });
      setOfflineMode(currentSettings.offlineMode);
    };
    fetchSettings();
  }, []);

  const handleClearDatabase = async () => {
    Alert.alert(
      "Clear Database",
      "Are you sure you want to clear the database?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: clearDatabase,
        },
      ]
    );
  };

  const clearDatabase = async () => {
    setShowLoader(true);
    await firestoreService.clearDatabase();
    setShowLoader(false);
  };

  const handleSettingChange = async (key: string, value: any) => {
    try {
      await updateSettings({ [key]: value });
      applySettingsChanges({ ...currentSettings, [key]: value });
      // Update local state
      switch (key) {
        case "darkMode":
          toggleTheme();
          break;
        case "notifications":
          setNotifications(value);
          break;
        case "showMatchTimer":
          setShowMatchTimer(value);
          break;
        case "offlineMode":
          setOfflineMode(value);
          toggleCache(value);
          break;
        case "autoUpdate":
          setAutoUpdate(value);
          break;
        case "clearDatabase":
          handleClearDatabase();
          break;
        case "matchTime":
          setMatchTime({
            hours: value.hours,
            minutes: value.minutes,
            seconds: value.seconds,
          });
          break;
      }
    } catch (error) {
      console.error("Error updating setting:", error);
      // Optionally, show an error message to the user
    }
  };

  const SettingItem = ({
    title,
    icon,
    value,
    onValueChange,
    type = "switch",
    settingKey,
  }: {
    title: string;
    icon: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    type?: "switch" | "button";
    settingKey: string;
  }) => (
    <View style={themeStyles.settingItem}>
      <View style={themeStyles.settingLeft}>
        <Ionicons
          name={icon as any}
          size={24}
          color={currentTheme === "dark" ? "#B0B0B0" : "#666"}
        />
        <Text style={themeStyles.settingTitle}>{title}</Text>
      </View>
      {type === "switch" ? (
        <Switch
          value={value}
          onValueChange={(newValue) =>
            handleSettingChange(settingKey, newValue)
          }
          trackColor={{
            false: currentTheme === "dark" ? "#767577" : "#D1D1D1",
            true: currentTheme === "dark" ? "#81b0ff" : "#4CAF50",
          }}
          thumbColor={value ? "#f5dd4b" : "#f4f3f4"}
        />
      ) : (
        <TouchableOpacity
          style={themeStyles.button}
          onPress={() => handleSettingChange(settingKey, !value)}
        >
          <Text style={themeStyles.buttonText}>
            {settingKey === "darkMode"
              ? currentTheme === "dark"
                ? "Light Mode"
                : "Dark Mode"
              : title}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={themeStyles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={
            currentTheme === "dark"
              ? ["#2c3e50", "#34495e"]
              : ["#ffffff", "#f5f5f5"]
          }
          style={themeStyles.card}
        >
          <SettingItem
            title="Dark Mode"
            icon="moon-outline"
            value={currentTheme === "dark"}
            onValueChange={toggleTheme}
            type="button"
            settingKey="darkMode"
          />
          <SettingItem
            title="Notifications"
            icon={notifications ? "notifications" : "notifications-off"}
            value={notifications}
            onValueChange={setNotifications}
            settingKey="notifications"
          />
          <SettingItem
            title="Show match timer"
            icon="timer-outline"
            value={showMatchTimer}
            onValueChange={setShowMatchTimer}
            settingKey="showMatchTimer"
          />
          {showMatchTimer && (
            <TouchableOpacity
              style={themeStyles.timeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={themeStyles.timeButtonText}>
                Show a reminder after
                {matchTime.hours > 0 ? ` ${matchTime.hours} hours,` : ""}
                {matchTime.minutes > 0 ? ` ${matchTime.minutes} minutes,` : ""}
                {matchTime.seconds > 0
                  ? ` ${matchTime.seconds} seconds`
                  : ""}{" "}
                of inactivity.
              </Text>
            </TouchableOpacity>
          )}
          <SettingItem
            title="Offline mode"
            icon={offlineMode ? "cloud-offline-outline" : "wifi-outline"}
            value={currentSettings.offlineMode}
            onValueChange={setOfflineMode}
            settingKey="offlineMode"
          />
          <SettingItem
            title="Auto Update"
            icon="refresh"
            value={autoUpdate}
            onValueChange={setAutoUpdate}
            settingKey="autoUpdate"
          />
          <SettingItem
            title="Clear Database"
            icon="trash"
            value={false}
            onValueChange={handleClearDatabase}
            type="button"
            settingKey="clearDatabase"
          />
        </LinearGradient>
      </ScrollView>
      {showTimePicker && (
        <View style={themeStyles.timePickerOverlay}>
          <TimePicker
            initialHour={matchTime.hours}
            initialMinute={matchTime.minutes}
            initialSecond={matchTime.seconds}
            onTimeChange={(hours, minutes, seconds) => {
              handleSettingChange("matchTime", { hours, minutes, seconds });
              setMatchTime({ hours, minutes, seconds });
              setShowTimePicker(false);
            }}
            onCancel={() => setShowTimePicker(false)}
          />
        </View>
      )}
      {showLoader && <Loader />}
    </View>
  );
};

const darkStyles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#121212",
    flex: 1,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 20,
    marginTop: 40,
    textAlign: "center",
  },
  card: {
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingTitle: {
    fontSize: 16,
    color: "#FFFFFF",
    marginLeft: 12,
  },
  button: {
    backgroundColor: "#3498db",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  timeButton: {
    backgroundColor: "#3498db",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  timeButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    textAlign: "center",
  },
  timePickerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

const lightStyles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f8f9fa",
    flex: 1,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 20,
    marginTop: 40,
    textAlign: "center",
  },
  card: {
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingTitle: {
    fontSize: 16,
    color: "#333333",
    marginLeft: 12,
  },
  button: {
    backgroundColor: "#3498db",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  timeButton: {
    backgroundColor: "#3498db",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  timeButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    textAlign: "center",
  },
  timePickerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export default Settings;

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import "react-native-reanimated";
import { AppThemeProvider } from "@/context/ThemeContext";
import { settings } from "@/types/settings";
import { useColorScheme } from "@/hooks/useColorScheme";
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from "react-native-paper";
import { useMaterial3Theme } from "@pchmn/expo-material3-theme";
import { useSettings } from "@/hooks/useSettings";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  const { theme } = useMaterial3Theme();
  const { settings } = useSettings();

  const [customTheme, setTheme] = useState(
    colorScheme === "dark" ? DarkTheme : DefaultTheme
  );
  const [currentTheme, setCurrentTheme] = useState<"dark" | "light">(
    colorScheme === "dark" ? "dark" : "light"
  );
  const [currentSettings, setCurrentSettings] = useState<settings>(settings);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      setCurrentSettings(settings);
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  const toggleTheme = () => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === DarkTheme ? DefaultTheme : DarkTheme;
      setCurrentTheme(newTheme === DarkTheme ? "dark" : "light");
      return newTheme;
    });
  };

  const updateSettings = (settings: settings) => {
    setCurrentSettings(settings);
  };

  const paperTheme =
    currentTheme === "dark"
      ? { ...MD3DarkTheme, colors: theme.dark }
      : { ...MD3LightTheme, colors: theme.light };

  return (
    <ThemeProvider value={customTheme}>
      <PaperProvider theme={paperTheme}>
        <AppThemeProvider
          toggleTheme={toggleTheme}
          currentTheme={currentTheme}
          currentSettings={currentSettings}
          applySettingsChanges={updateSettings}
        >
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
            <Stack.Screen
              name="createMatch"
              options={{
                headerTitle: "Create match",
                animation: "slide_from_right",
              }}
            />
            <Stack.Screen
              name="toss"
              options={{ headerTitle: "Toss", animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="createTeam"
              options={{
                headerTitle: "Create team",
                animation: "slide_from_right",
              }}
            />
            <Stack.Screen
              name="teamLineup"
              options={{
                headerTitle: "Playing XI",
                animation: "slide_from_right",
              }}
            />
            <Stack.Screen
              name="matchSettings"
              options={{
                headerTitle: "Match settings",
                animation: "slide_from_right",
              }}
            />
            <Stack.Screen
              name="players"
              options={{
                headerTitle: "Players",
                animation: "slide_from_right",
              }}
            />
            <Stack.Screen
              name="createPlayer"
              options={{
                headerTitle: "Add new player",
                animation: "slide_from_right",
              }}
            />
            <Stack.Screen
              name="player/[id]"
              options={{
                headerTitle: "Player profile",
                animation: "slide_from_right",
              }}
            />
            <Stack.Screen
              name="matchSummary"
              options={{
                headerTitle: "Match summary",
                animation: "slide_from_right",
              }}
            />
            <Stack.Screen
              name="playerRecords"
              options={{
                headerTitle: "Player stats",
                animation: "slide_from_right",
              }}
            />
            <Stack.Screen
              name="settings"
              options={{
                headerTitle: "Settings",
                animation: "slide_from_right",
              }}
            />
          </Stack>
        </AppThemeProvider>
      </PaperProvider>
    </ThemeProvider>
  );
}

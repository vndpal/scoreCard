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

import { useColorScheme } from "@/hooks/useColorScheme";
import { PaperProvider } from "react-native-paper";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  const [theme, setTheme] = useState(
    colorScheme === "dark" ? DarkTheme : DefaultTheme
  );
  const [currentTheme, setCurrentTheme] = useState<"dark" | "light">(
    colorScheme === "dark" ? "dark" : "light"
  );

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
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

  return (
    <ThemeProvider value={theme}>
      <PaperProvider>
        <AppThemeProvider toggleTheme={toggleTheme} currentTheme={currentTheme}>
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
          </Stack>
        </AppThemeProvider>
      </PaperProvider>
    </ThemeProvider>
  );
}

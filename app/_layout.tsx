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
import { AppContextProvider } from "@/context/AppContext";
import { settings } from "@/types/settings";
import { useColorScheme } from "@/hooks/useColorScheme";
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from "react-native-paper";
import { useMaterial3Theme } from "@pchmn/expo-material3-theme";
import { useSettings } from "@/hooks/useSettings";
import { Club } from "@/firebase/models/Club";
import { STORAGE_ITEMS } from "@/constants/StorageItems";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Tournament } from "@/firebase/models/Tournament";
import { View, Image, ActivityIndicator, Button } from "react-native";
import { getCrashlytics, log } from "@react-native-firebase/crashlytics";
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

  const [club, setClub] = useState<Club>({
    id: "",
    name: "",
  });
  const [isAppInitialized, setIsAppInitialized] = useState(false);

  const [currentTournament, setCurrentTournament] = useState<string>("");

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();

      // Log app mount to Crashlytics
      try {
        log(getCrashlytics(), "App mounted.");
      } catch (error) {
        console.error("Failed to log to Crashlytics:", error);
      }

      setCurrentSettings(settings);

      const initializeApp = async () => {
        try {
          // Get saved theme
          const savedTheme = await AsyncStorage.getItem(STORAGE_ITEMS.THEME);
          if (savedTheme) {
            const theme = savedTheme as "dark" | "light";
            setCurrentTheme(theme);
            setTheme(theme === "dark" ? DarkTheme : DefaultTheme);
          }

          // Get saved club
          const club = await AsyncStorage.getItem(STORAGE_ITEMS.USER_CLUB);
          if (club) {
            setClub(JSON.parse(club));
            const currentTournament = await Tournament.getByStatus(
              "ongoing",
              JSON.parse(club).id
            );

            if (currentTournament) {
              console.log(
                "currentTournament from _layout.tsx",
                currentTournament[0].id
              );
              setCurrentTournament(currentTournament[0].id);
            }
          }
        } catch (error) {
          console.error("Error initializing app:", error);
        } finally {
          setIsAppInitialized(true);
        }
      };

      initializeApp();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  const toggleTheme = () => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === DarkTheme ? DefaultTheme : DarkTheme;
      const newThemeType = newTheme === DarkTheme ? "dark" : "light";
      setCurrentTheme(newThemeType);
      // Save theme preference
      AsyncStorage.setItem(STORAGE_ITEMS.THEME, newThemeType);
      return newTheme;
    });
  };

  const updateSettings = (settings: settings) => {
    setCurrentSettings(settings);
  };

  const updateClub = (club: Club) => {
    setClub(club);
  };

  const updateCurrentTournament = (tournament: string) => {
    setCurrentTournament(tournament);
  };

  const paperTheme =
    currentTheme === "dark"
      ? { ...MD3DarkTheme, colors: theme.dark }
      : { ...MD3LightTheme, colors: theme.light };

  return (
    <ThemeProvider value={customTheme}>
      <PaperProvider theme={paperTheme}>
        <AppContextProvider
          toggleTheme={toggleTheme}
          currentTheme={currentTheme}
          currentSettings={currentSettings}
          applySettingsChanges={updateSettings}
          club={club}
          updateClub={updateClub}
          currentTournament={currentTournament}
          updateCurrentTournament={updateCurrentTournament}
        >
          {isAppInitialized ? (
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
                  headerTitle: "Create new team",
                  animation: "slide_from_right",
                }}
              />
              <Stack.Screen
                name="teamLineup"
                options={{
                  headerTitle: "Team Selection",
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
              <Stack.Screen
                name="club"
                options={{
                  headerShown: false,
                  animation: "flip",
                }}
              />
              <Stack.Screen
                name="tournaments"
                options={{
                  headerTitle: "Tournaments",
                  animation: "slide_from_right",
                }}
              />
            </Stack>
          ) : (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Image
                source={require("../assets/images/logo.png")}
                style={{ width: 350, height: 350, resizeMode: "contain" }}
              />
            </View>
          )}
          {/* Temporary Crash Button for Testing */}
          {/* <Button title="Crash" onPress={() => crashlytics().crash()} /> */}
        </AppContextProvider>
      </PaperProvider>
    </ThemeProvider>
  );
}

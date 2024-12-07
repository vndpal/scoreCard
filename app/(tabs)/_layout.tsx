import React, { useState, useEffect } from "react";
import {
  Tabs,
  useRouter,
  usePathname,
  useRootNavigationState,
} from "expo-router";
import { TabBarIcon } from "@/components/navigation/TabBarIcon";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import MenuScreen from "./menu";
import { BackHandler, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_ITEMS } from "@/constants/StorageItems";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (pathname === "/" && rootNavigationState?.key) {
      const checkClub = async () => {
        const club = await AsyncStorage.getItem(STORAGE_ITEMS.USER_CLUB);
        if (!club) {
          router.replace("/club");
          return;
        }
        router.replace("/");
      };
      checkClub();

      // Add back button handler
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          Alert.alert("Exit App", "Are you sure you want to exit the app?", [
            {
              text: "Cancel",
              onPress: () => null,
              style: "cancel",
            },
            { text: "YES", onPress: () => BackHandler.exitApp() },
          ]);
          return true; // Prevent default behavior
        }
      );

      // Clean up the event listener
      return () => backHandler.remove();
    }
  }, [pathname, router, rootNavigationState?.key]);

  const showMenu = () => setMenuVisible(true);
  const hideMenu = () => setMenuVisible(false);

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? "light"].tabIconDefault,
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Scorecard",
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                name={focused ? "clipboard" : "clipboard-outline"}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: "Matches",
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                name={focused ? "trophy" : "trophy-outline"}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="menu"
          options={{
            title: "Menu",
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                name={focused ? "menu" : "menu-outline"}
                color={color}
              />
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              showMenu();
            },
          }}
        />
      </Tabs>
      <MenuScreen visible={menuVisible} hideMenu={hideMenu} />
    </>
  );
}

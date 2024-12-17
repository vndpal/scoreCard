import { useState, useEffect } from "react";
import { getItem } from "@/utils/asyncStorage";
import { STORAGE_ITEMS } from "@/constants/StorageItems";
import { settings } from "@/types/settings";

interface MatchTime {
  hours: number;
  minutes: number;
  seconds: number;
}

const defaultSettings: settings = {
  theme: "light",
  notifications: false,
  showMatchTimer: false,
  matchTime: { hours: 0, minutes: 0, seconds: 30 },
  autoUpdate: false,
  offlineMode: false,
};

export const useSettings = () => {
  const [settings, setSettings] = useState<settings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const storedSettings = await getItem(STORAGE_ITEMS.SETTINGS);
        if (storedSettings) {
          setSettings({ ...defaultSettings, ...storedSettings });
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { settings, loading };
};

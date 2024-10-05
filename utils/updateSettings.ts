import { settings } from "../types/settings";
import { setItem, getItem, mergeItem } from "./asyncStorage";
import { STORAGE_ITEMS } from "../constants/StorageItems";

export const updateSettings = async (
  newSettings: Partial<settings>
): Promise<settings> => {
  try {
    const currentSettings = (await getItem(
      STORAGE_ITEMS.SETTINGS
    )) as settings | null;

    if (!currentSettings) {
      await setItem(STORAGE_ITEMS.SETTINGS, newSettings);
      return newSettings as settings;
    }

    const updatedSettings = { ...currentSettings, ...newSettings };

    await mergeItem(STORAGE_ITEMS.SETTINGS, newSettings);

    return updatedSettings;
  } catch (error) {
    console.error("Error updating settings:", error);
    throw error;
  }
};

export const getSettings = async (): Promise<settings | null> => {
  return (await getItem(STORAGE_ITEMS.SETTINGS)) as settings | null;
};

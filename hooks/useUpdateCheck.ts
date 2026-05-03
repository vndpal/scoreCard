import { useEffect, useState } from "react";
import * as Updates from "expo-updates";

export const useUpdateCheck = () => {
  const { isUpdateAvailable, isUpdatePending } = Updates.useUpdates();
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        if (!__DEV__) {
          await Updates.checkForUpdateAsync();
        }
      } catch (error) {
        console.warn("Update check not available in this environment");
      }
    };

    checkForUpdates();
  }, []);

  useEffect(() => {
    if (isUpdatePending) {
      Updates.reloadAsync();
    }
  }, [isUpdatePending]);

  const downloadAndRestart = async () => {
    try {
      setIsDownloading(true);
      await Updates.fetchUpdateAsync();
    } catch (error) {
      console.error("Error downloading update:", error);
      setIsDownloading(false);
    }
  };

  return {
    isUpdateAvailable,
    isDownloading,
    downloadAndRestart,
  };
};

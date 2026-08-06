import { Club } from "@/types/club";
import { settings } from "@/types/settings";
import React, { createContext, useContext } from "react";

interface AppContextType {
  toggleTheme: () => void;
  currentTheme: "dark" | "light";
  currentSettings: settings;
  club: Club;
  updateClub: (club: Club) => void;
  applySettingsChanges: (settings: settings) => void;
  currentTournament: string;
  updateCurrentTournament: (tournament: string) => void;
  /**
   * Id of the match that was already live when the app cold-started, or null.
   * Computed once during launch and never updated — it only decides which
   * screen the app lands on.
   */
  liveMatchIdOnLaunch: string | null;
  /**
   * True once the user has explicitly asked for the scoring screen. Lives in
   * memory only, so the next cold start lands on the viewer again.
   */
  entryMode: boolean;
  setEntryMode: (value: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within a AppContextProvider");
  }
  return context;
};

export const AppContextProvider: React.FC<{
  toggleTheme: () => void;
  currentTheme: "dark" | "light";
  currentSettings: settings;
  club: Club;
  updateClub: (club: Club) => void;
  applySettingsChanges: (settings: settings) => void;
  currentTournament: string;
  updateCurrentTournament: (tournament: string) => void;
  liveMatchIdOnLaunch: string | null;
  entryMode: boolean;
  setEntryMode: (value: boolean) => void;
  children: React.ReactNode;
}> = ({
  children,
  toggleTheme,
  currentTheme,
  currentSettings,
  applySettingsChanges,
  club,
  updateClub,
  currentTournament,
  updateCurrentTournament,
  liveMatchIdOnLaunch,
  entryMode,
  setEntryMode,
}) => {
  return (
    <AppContext.Provider
      value={{
        toggleTheme,
        currentTheme,
        currentSettings,
        applySettingsChanges,
        club: club,
        updateClub,
        currentTournament,
        updateCurrentTournament,
        liveMatchIdOnLaunch,
        entryMode,
        setEntryMode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

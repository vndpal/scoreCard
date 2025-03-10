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
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

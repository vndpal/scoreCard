import { Club } from "@/types/club";
import { settings } from "@/types/settings";
import React, { createContext, useContext } from "react";

interface ThemeContextType {
  toggleTheme: () => void;
  currentTheme: "dark" | "light";
  currentSettings: settings;
  club: Club;
  updateClub: (club: Club) => void;
  applySettingsChanges: (settings: settings) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const AppThemeProvider: React.FC<{
  toggleTheme: () => void;
  currentTheme: "dark" | "light";
  currentSettings: settings;
  club: Club;
  updateClub: (club: Club) => void;
  applySettingsChanges: (settings: settings) => void;
  children: React.ReactNode;
}> = ({
  children,
  toggleTheme,
  currentTheme,
  currentSettings,
  applySettingsChanges,
  club,
  updateClub,
}) => {
  return (
    <ThemeContext.Provider
      value={{
        toggleTheme,
        currentTheme,
        currentSettings,
        applySettingsChanges,
        club: club,
        updateClub,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

import React, { createContext, useContext } from "react";

interface ThemeContextType {
  toggleTheme: () => void;
  currentTheme: "dark" | "light";
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
  children: React.ReactNode;
}> = ({ children, toggleTheme, currentTheme }) => {
  return (
    <ThemeContext.Provider value={{ toggleTheme, currentTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

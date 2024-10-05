type settings = {
  theme: "light" | "dark";
  notifications: boolean;
  soundEffects: boolean;
  autoUpdate: boolean;
  showMatchTimer: boolean;
  matchTime: { hours: number; minutes: number; seconds: number };
};

export type { settings };

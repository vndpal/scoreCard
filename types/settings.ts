type settings = {
  theme: "light" | "dark";
  notifications: boolean;
  autoUpdate: boolean;
  showMatchTimer: boolean;
  offlineMode: boolean;
  celebrations: boolean;
  matchTime: { hours: number; minutes: number; seconds: number };
};

export type { settings };

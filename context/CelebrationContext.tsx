import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { CelebrationEvent } from "@/types/celebration";
import { useAppContext } from "@/context/AppContext";

// How long a celebration stays on screen before auto-dismissing.
// Exported so the overlay's countdown bar can stay in sync with the timer.
export const AUTO_DISMISS_MS = 5000;
// Cap the queue so a flurry of milestones can't chain into a long sequence.
const MAX_QUEUE = 3;

interface CelebrationContextType {
  // The milestone currently being shown (queue head), or null when idle.
  active: CelebrationEvent | null;
  // Enqueue milestones. No-ops entirely when the setting is disabled.
  celebrate: (events: CelebrationEvent[]) => void;
  // Dismiss the active milestone early (advances the queue).
  dismiss: () => void;
}

const CelebrationContext = createContext<CelebrationContextType | undefined>(
  undefined
);

export const useCelebration = () => {
  const context = useContext(CelebrationContext);
  if (!context) {
    throw new Error(
      "useCelebration must be used within a CelebrationProvider"
    );
  }
  return context;
};

export const CelebrationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { currentSettings } = useAppContext();
  const [queue, setQueue] = useState<CelebrationEvent[]>([]);
  const active = queue.length > 0 ? queue[0] : null;

  const celebrate = useCallback(
    (events: CelebrationEvent[]) => {
      // Feature gate: when celebrations are off, do nothing at all.
      if (!currentSettings.celebrations) return;
      if (!events || events.length === 0) return;
      setQueue((prev) => [...prev, ...events].slice(0, MAX_QUEUE));
    },
    [currentSettings.celebrations]
  );

  const dismiss = useCallback(() => {
    setQueue((prev) => prev.slice(1));
  }, []);

  // Auto-dismiss the active milestone after 5s. Re-arms whenever the head
  // changes; the cleanup clears the timer on manual dismiss / unmount.
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => {
      setQueue((prev) => prev.slice(1));
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
    // Keyed on the id so a new head restarts the timer.
  }, [active?.id]);

  return (
    <CelebrationContext.Provider value={{ active, celebrate, dismiss }}>
      {children}
    </CelebrationContext.Provider>
  );
};

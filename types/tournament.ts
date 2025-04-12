import { Timestamp } from "@react-native-firebase/firestore";

type tournament = {
  id: string;
  name: string;
  date: Timestamp;
  clubId: string;
  isBoxCricket: boolean;
  status: "upcoming" | "ongoing" | "completed";
};

export type { tournament };

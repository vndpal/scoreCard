import { Timestamp } from "@react-native-firebase/firestore";

type tournament = {
  id: string;
  name: string;
  date: Timestamp;
  clubId: string;
  status: "upcoming" | "ongoing" | "completed";
};

export type { tournament };

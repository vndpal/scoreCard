import { Timestamp } from "@react-native-firebase/firestore";

type tournament = {
  id: string;
  name: string;
  date: Timestamp;
  clubId: string;
  isBoxCricket: boolean;
  status: "upcoming" | "ongoing" | "completed";
  // Number of teams in the tournament. Drives the Match History display:
  // 2 (default) shows the head-to-head screen, >2 shows the standings table.
  // Optional at read because tournaments created before this field default to 2.
  numberOfTeams?: number;
};

export type { tournament };

import { player } from "./player";

type teamPlayerMapping = {
  id: string;
  team: string;
  clubId: string;
  players: player[];
};

export type { teamPlayerMapping };

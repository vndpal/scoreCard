import { player } from "./player";
import { team } from "./team";

type teamPlayerMapping = {
  [team: string]: player[];
};

export type { teamPlayerMapping };

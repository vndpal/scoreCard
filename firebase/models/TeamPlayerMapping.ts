import { firestoreService } from "../services/firestore";
import { teamPlayerMapping } from "../../types/teamPlayerMapping";
import { player } from "@/types/player";

const COLLECTION_NAME = "teamPlayerMapping";

export class TeamPlayerMapping implements teamPlayerMapping {
  id: string;
  team: string;
  clubId: string;
  players: player[];

  constructor(id: string, team: string, clubId: string, players: player[]) {
    this.id = id;
    this.team = team;
    this.clubId = clubId;
    this.players = players;
  }

  static async createOrUpdate(
    team: string,
    clubId: string,
    players: player[]
  ): Promise<TeamPlayerMapping> {
    // Firestore rejects `undefined`. Drop any keys whose value is undefined
    // (e.g. `role` on legacy players that haven't been backfilled yet).
    const sanitizedPlayers: player[] = players.map((p) => {
      const out: Record<string, unknown> = {};
      Object.entries(p).forEach(([k, v]) => {
        if (v !== undefined) out[k] = v;
      });
      return out as player;
    });

    const isTeamPlayerMappingExists: teamPlayerMapping[] =
      await firestoreService.query<teamPlayerMapping>(COLLECTION_NAME, [
        {
          field: "team",
          operator: "==",
          value: team,
        },
        {
          field: "clubId",
          operator: "==",
          value: clubId,
        },
      ]);

    if (isTeamPlayerMappingExists.length > 0) {
      await firestoreService.update(
        COLLECTION_NAME,
        isTeamPlayerMappingExists[0].id,
        {
          players: sanitizedPlayers,
        }
      );
      return new TeamPlayerMapping(
        isTeamPlayerMappingExists[0].id,
        team,
        clubId,
        sanitizedPlayers
      );
    } else {
      const id = await firestoreService.createWithAutoId(COLLECTION_NAME, {
        team,
        clubId,
        players: sanitizedPlayers,
      });
      return new TeamPlayerMapping(id, team, clubId, sanitizedPlayers);
    }
  }

  static async getAllFromClub(clubId: string): Promise<TeamPlayerMapping[]> {
    const mappings = await firestoreService.query<{
      id: string;
      team: string;
      clubId: string;
      players: player[];
    }>(COLLECTION_NAME, [
      {
        field: "clubId",
        operator: "==",
        value: clubId,
      },
    ]);
    return mappings.map(
      ({ id, team, clubId, players }) =>
        new TeamPlayerMapping(id, team, clubId, players)
    );
  }

  static async getPlayersFromTeamAndClub(
    team: string,
    clubId: string
  ): Promise<player[]> {
    const teamPlayerMapping = await firestoreService.query<teamPlayerMapping>(
      COLLECTION_NAME,
      [
        { field: "team", operator: "==", value: team },
        { field: "clubId", operator: "==", value: clubId },
      ]
    );
    return teamPlayerMapping[0].players;
  }

  toObject(): teamPlayerMapping {
    return {
      id: this.id,
      team: this.team,
      clubId: this.clubId,
      players: this.players,
    };
  }
}

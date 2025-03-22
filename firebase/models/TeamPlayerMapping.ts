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
          players,
        }
      );
      return new TeamPlayerMapping(
        isTeamPlayerMappingExists[0].id,
        team,
        clubId,
        players
      );
    } else {
      const id = await firestoreService.createWithAutoId(COLLECTION_NAME, {
        team,
        clubId,
        players,
      });
      return new TeamPlayerMapping(id, team, clubId, players);
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

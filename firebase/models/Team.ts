import { firestoreService } from "../services/firestore";
import { team } from "../../types/team";

const COLLECTION_NAME = "teams";

export class Team implements team {
  id: string;
  teamName: string;
  teamInitials: string;
  teamShortName: string;
  clubId: string;
  enabled?: boolean;

  constructor(id: string, data: team) {
    this.id = id;
    this.teamName = data.teamName;
    this.teamInitials = data.teamInitials;
    // Legacy teams have no teamShortName; fall back to their initials so the UI
    // always has a short label to show (no data migration needed).
    this.teamShortName = data.teamShortName ?? data.teamInitials;
    this.clubId = data.clubId;
    this.enabled = data.enabled;
  }

  static async create(data: Omit<team, "id">): Promise<Team> {
    const id = await firestoreService.createWithAutoId(COLLECTION_NAME, data);
    return new Team(id, { id, ...data });
  }

  static async getById(id: string): Promise<Team | null> {
    console.log("id", id);
    const data = await firestoreService.get<team>(COLLECTION_NAME, id);
    return data ? new Team(id, data) : null;
  }

  // Active teams only. Legacy teams have no `enabled` field, so anything that
  // isn't explicitly `false` is treated as active. (Filtered client-side so
  // those legacy docs aren't excluded the way a Firestore `==` filter would.)
  static async getAllByClubId(clubId: string): Promise<Team[]> {
    const teams = await firestoreService.query<team>(COLLECTION_NAME, [
      { field: "clubId", operator: "==", value: clubId },
    ]);
    return teams
      .filter((team) => team.enabled !== false)
      .map((team) => new Team(team.id ?? "", team));
  }

  // Disabled (soft-deleted) teams, for the restore list.
  static async getDisabledByClubId(clubId: string): Promise<Team[]> {
    const teams = await firestoreService.query<team>(COLLECTION_NAME, [
      { field: "clubId", operator: "==", value: clubId },
    ]);
    return teams
      .filter((team) => team.enabled === false)
      .map((team) => new Team(team.id ?? "", team));
  }

  static async getAll(): Promise<Team[]> {
    const teams = await firestoreService.getAll<team>(COLLECTION_NAME);
    return teams.map((team) => new Team(team.id ?? "", team));
  }

  async update(data: Partial<team>): Promise<void> {
    await firestoreService.update(COLLECTION_NAME, this.id, data);
    Object.assign(this, data);
  }

  async delete(): Promise<void> {
    await firestoreService.delete(COLLECTION_NAME, this.id);
  }

  static async findByInitials(name: string, clubId: string): Promise<Team[]> {
    const teams = await firestoreService.query<team & { id: string }>(
      COLLECTION_NAME,
      [
        {
          field: "teamInitials",
          operator: "==",
          value: name,
        },
        {
          field: "clubId",
          operator: "==",
          value: clubId,
        },
      ]
    );
    return teams.map((team) => new Team(team.id, team));
  }

  // Finds teams in a club whose name AND short name both match (case-insensitive).
  // Used to reject creating an exact duplicate team. teamInitials is not part of
  // this check because it is auto-generated to be unique.
  static async findByNameAndShortName(
    teamName: string,
    teamShortName: string,
    clubId: string
  ): Promise<Team[]> {
    const teams = await Team.getAllByClubId(clubId);
    const name = teamName.trim().toLowerCase();
    const shortName = teamShortName.trim().toLowerCase();
    return teams.filter(
      (team) =>
        team.teamName.trim().toLowerCase() === name &&
        team.teamShortName.trim().toLowerCase() === shortName
    );
  }

  // Produces a 3-char teamInitials code that is unique within the club. Starts
  // from the user's short name; if that code is already taken, keeps the first
  // two chars and tries a random alphanumeric. Tries at most 5 codes in total
  // and returns null if all collide, so the caller can ask the user for a
  // different short name. teamInitials is never user-edited, so it is permanent.
  static async generateUniqueInitials(
    shortName: string,
    clubId: string
  ): Promise<string | null> {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const randomChar = () => chars[Math.floor(Math.random() * chars.length)];

    const isFree = async (code: string) =>
      (await Team.findByInitials(code, clubId)).length === 0;

    const candidate = shortName.toUpperCase().slice(0, 3);
    // Attempt 1: the short name itself.
    if (candidate && (await isFree(candidate))) {
      return candidate;
    }

    // Attempts 2-5: keep the recognisable prefix with a varied last char.
    const prefix = candidate.slice(0, 2);
    for (let i = 0; i < 4; i++) {
      const variant = (prefix + randomChar()).slice(0, 3);
      if (await isFree(variant)) {
        return variant;
      }
    }

    // Gave up after 5 attempts.
    return null;
  }

  toObject(): team & { id: string } {
    return {
      id: this.id,
      teamName: this.teamName,
      teamInitials: this.teamInitials,
      teamShortName: this.teamShortName,
      clubId: this.clubId,
      enabled: this.enabled,
    };
  }
}

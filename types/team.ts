type team = {
  id?: string;
  teamName: string;
  // Immutable, auto-generated join key (3-char code). Used everywhere as the
  // foreign key linking teams to matches, rosters and stats. Never edited.
  teamInitials: string;
  // Editable short label shown in the UI (3-char uppercase). Renaming a team
  // changes teamName/teamShortName but never teamInitials, so links stay intact.
  teamShortName: string;
  clubId: string;
  // Soft-delete flag. Absent/true => active; false => disabled (hidden from
  // the teams list and match setup, but kept so it can be restored).
  enabled?: boolean;
};

export type { team };

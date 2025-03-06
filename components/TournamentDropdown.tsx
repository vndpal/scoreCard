import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { Dropdown } from "react-native-paper-dropdown";
import { useTheme } from "@/context/ThemeContext";
import { Tournament } from "@/firebase/models/Tournament";
import { Timestamp } from "@react-native-firebase/firestore";

interface TournamentDropdownProps {
  selectedTournament: Tournament | undefined;
  onTournamentSelect: (tournament: Tournament) => void;
  isAllTournaments?: boolean;
}

const TournamentDropdown = ({
  selectedTournament,
  onTournamentSelect,
  isAllTournaments = false,
}: TournamentDropdownProps) => {
  const { currentTheme, currentTournament, club } = useTheme();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  useEffect(() => {
    const fetchTournaments = async () => {
      const tournamentList = await Tournament.getAllByClubId(club.id);
      tournamentList.sort((a, b) => {
        const dateA = a.date.toDate();
        const dateB = b.date.toDate();
        return dateB.getTime() - dateA.getTime();
      });
      if (tournamentList.length > 0) {
        const defaultTournament =
          tournamentList.find((t) => t.id === currentTournament) ||
          tournamentList[0];
        onTournamentSelect(defaultTournament);
      }

      if (isAllTournaments) {
        tournamentList.unshift({
          id: "all",
          name: "All",
          date: Timestamp.now(),
          clubId: "",
          status: "upcoming",
        });
      }
      setTournaments(tournamentList);
    };

    fetchTournaments();
  }, []);

  const dropdownItems = tournaments.map((tournament) => ({
    label: tournament.name,
    value: tournament.id,
  }));

  return (
    <View style={styles.container}>
      <Dropdown
        label="Tournaments"
        options={dropdownItems}
        value={selectedTournament?.id}
        onSelect={(value) => {
          const tournament = tournaments.find((t) => t.id === value);
          if (tournament) {
            onTournamentSelect(tournament);
          }
        }}
        mode="outlined"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 20,
    zIndex: 1,
  },
});

export default TournamentDropdown;

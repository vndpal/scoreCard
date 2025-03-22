import { getItem, setItem } from "@/utils/asyncStorage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Keyboard,
  View,
  StyleSheet,
  Dimensions,
  GestureResponderEvent,
  Alert,
  Text,
} from "react-native";
import {
  Button,
  TextInput,
  HelperText,
  Switch,
  Snackbar,
} from "react-native-paper";
import { Formik, useFormik } from "formik";
import * as Yup from "yup";
import { match } from "@/types/match";
import { STORAGE_ITEMS } from "@/constants/StorageItems";
import { team } from "@/types/team";
import { Dropdown } from "react-native-paper-dropdown";
import { playerMatchStats } from "@/types/playerMatchStats";
import { playerStats } from "@/types/playerStats";
import { useAppContext } from "@/context/AppContext";
import { Team } from "@/firebase/models/Team";
import { TeamPlayerMapping } from "@/firebase/models/TeamPlayerMapping";
import { PlayerMatchStats } from "@/firebase/models/PlayerMatchStats";
import { Match } from "@/firebase/models/Match";
import { Timestamp } from "@react-native-firebase/firestore";
import { player } from "@/types/player";
import { Tournament } from "@/firebase/models/Tournament";
import { tournament } from "@/types/tournament";

const createMatchSchema = Yup.object().shape({
  team1: Yup.string().required("Batting team is required"),
  team2: Yup.string().required("Fielding team is required"),
  overs: Yup.number().required("Overs are required"),
  wickets: Yup.number(),
  quickMatch: Yup.boolean(),
});

type items = {
  label: string;
  value: string;
};

export const CreateMatch = () => {
  const [teams, setTeams] = useState<items[]>([]);
  const { currentTheme, club } = useAppContext();
  const [tournament, setTournament] = useState<tournament>();
  const [showSnackbar, setShowSnackbar] = useState(false);
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  useEffect(() => {
    (async () => {
      const lastMatch: match | null = await Match.getLatestMatch(club.id);
      if (lastMatch && lastMatch.status == "completed") {
        const winner =
          lastMatch.winner == "team1" ? lastMatch.team1 : lastMatch.team2;
        const looser =
          lastMatch.winner == "team1" ? lastMatch.team2 : lastMatch.team1;
        formik.setValues({
          team1: winner,
          team2: looser,
          overs: lastMatch.overs.toString(),
          wickets: lastMatch.wickets?.toString() ?? "",
          quickMatch: false,
        });
      }

      const teams = await Team.getAllByClubId(club.id);
      if (teams) {
        setTeams(
          teams.map((team: team) => ({
            label: team.teamName,
            value: team.teamInitials,
          }))
        );
      }

      const tournament = await Tournament.getByStatus("ongoing", club.id);
      if (tournament && tournament.length > 0) {
        setTournament(tournament[0]);
      }
      if (tournament && tournament.length == 0) {
        setShowSnackbar(true);
      }
    })();
  }, []);

  const handleSubmit = async () => {
    if (formik.values.team1 === formik.values.team2) {
      alert("Batting and fielding team should be different.");
      return;
    }

    const lastMatch = await Match.getLatestMatch(club.id);
    const { overs, wickets, team1, team2, quickMatch } = formik.values;

    let team1Players: player[] = [];
    let team2Players: player[] = [];

    if (!quickMatch) {
      team1Players = await TeamPlayerMapping.getPlayersFromTeamAndClub(
        team1,
        club.id
      );
      team2Players = await TeamPlayerMapping.getPlayersFromTeamAndClub(
        team2,
        club.id
      );

      if (
        team1Players &&
        team2Players &&
        (team1Players.length == 0 ||
          team2Players.length == 0 ||
          Math.abs(team1Players.length - team2Players.length) > 1)
      ) {
        Alert.alert(
          "Team is not created properly",
          `Teams must have equal players or differ by at most 1 player!\n\n${team1}: ${team1Players.length}\n${team2}: ${team2Players.length}`
        );
        return;
      }
    }

    if (lastMatch) {
      if (lastMatch.status == "live") {
        alert(
          "There is already a live match. Please complete it before starting a new match."
        );
        return;
      }
    }

    const newMatch = await Match.create({
      manOfTheMatch: "",
      currentScore: {
        team1: {
          totalBalls: 0,
          totalRuns: 0,
          totalWickets: 0,
          totalOvers: 0,
        },
        team2: {
          totalBalls: 0,
          totalRuns: 0,
          totalWickets: 0,
          totalOvers: 0,
        },
      },
      overs: parseInt(overs),
      wickets: parseInt(wickets),
      team1,
      team2,
      team1Fullname: teams.find((team) => team.value === team1)?.label ?? "",
      team2Fullname: teams.find((team) => team.value === team2)?.label ?? "",
      tossWin: "team1",
      choose: "batting",
      status: "live",
      isFirstInning: true,
      startDateTime: Timestamp.now(),
      quickMatch: quickMatch,
      clubId: club?.id ?? "",
      tournamentId: tournament?.id ?? "",
    });

    if (!quickMatch) {
      const playerStats: playerStats[] = [];
      const playerIds: { playerId: string; team: string; name: string }[] = [];

      team1Players.forEach((player: player) => {
        playerIds.push({
          playerId: player.id,
          team: team1,
          name: player.name,
        });
      });

      team2Players.forEach((player: player) => {
        playerIds.push({
          playerId: player.id,
          team: team2,
          name: player.name,
        });
      });
      playerIds.forEach(
        (player: { playerId: string; team: string; name: string }) => {
          playerStats.push({
            playerId: player.playerId,
            name: player.name,
            team: player.team,
            runs: 0,
            ballsFaced: 0,
            fours: 0,
            sixes: 0,
            average: 0,
            isOut: false,
            strikeRate: 0,
            wickets: 0,
            ballsBowled: 0,
            overs: 0,
            runsConceded: 0,
            maidens: 0,
            bowlingEconomy: 0,
            extras: 0,
            foursConceded: 0,
            sixesConceded: 0,
            dotBalls: 0,
          });
        }
      );

      const playerStatsInMatch: playerMatchStats = {
        matchId: newMatch.matchId,
        tournamentId: tournament?.id ?? "",
        clubId: club?.id ?? "",
        playerMatchStats: playerStats,
        timestamp: Timestamp.now().seconds,
      };

      await PlayerMatchStats.create(playerStatsInMatch);
    }

    await setItem(STORAGE_ITEMS.IS_NEW_MATCH, true);
    Keyboard.dismiss();
    router.push("/");
  };

  const formik = useFormik({
    initialValues: {
      team1: "",
      team2: "",
      overs: "",
      wickets: "",
      quickMatch: false,
    },
    validationSchema: createMatchSchema,
    onSubmit: async (values) => {
      await handleSubmit();
    },
  });

  return (
    <View style={styles.formContainer}>
      <Dropdown
        label="Batting team"
        options={teams}
        value={formik.values.team1}
        onSelect={formik.handleChange("team1")}
        mode="outlined"
        error={!!formik.errors.team1 && !!formik.touched.team1}
      />
      <HelperText
        type="error"
        padding="none"
        visible={!!formik.errors.team1 && !!formik.touched.team1}
      >
        {formik.errors.team1}
      </HelperText>
      <Dropdown
        label="Fielding team"
        options={teams}
        value={formik.values.team2}
        onSelect={formik.handleChange("team2")}
        mode="outlined"
        error={!!formik.errors.team2 && !!formik.touched.team2}
      />
      <HelperText
        type="error"
        padding="none"
        visible={!!formik.errors.team2 && !!formik.touched.team2}
      >
        {formik.errors.team2}
      </HelperText>
      <TextInput
        style={styles.input}
        mode="outlined"
        label={"Overs"}
        placeholderTextColor={"#aaa"}
        keyboardType="numeric"
        value={formik.values.overs}
        onChangeText={formik.handleChange("overs")}
        onBlur={formik.handleBlur("overs")}
        error={!!formik.errors.overs && !!formik.touched.overs}
      />
      <HelperText
        type="error"
        padding="none"
        visible={!!formik.errors.overs && !!formik.touched.overs}
      >
        {formik.errors.overs}
      </HelperText>
      <TextInput
        style={styles.input}
        mode="outlined"
        label={"Wickets"}
        placeholderTextColor={"#aaa"}
        keyboardType="numeric"
        value={formik.values.wickets}
        onChangeText={formik.handleChange("wickets")}
        onBlur={formik.handleBlur("wickets")}
        error={!!formik.errors.wickets && !!formik.touched.wickets}
      />
      <HelperText
        type="error"
        padding="none"
        visible={!!formik.errors.wickets && !!formik.touched.wickets}
      >
        {formik.errors.wickets}
      </HelperText>
      <View style={styles.settingItem}>
        <View style={styles.quickMatchContainer}>
          <Text style={[styles.label, themeStyles.label]}>Quick match</Text>
          <HelperText
            type="info"
            visible={true}
            style={[styles.quickMatch, themeStyles.quickMatch]}
          >
            If you turn this on, player details will be skipped and only the
            match score will be tracked.
          </HelperText>
        </View>
        <Switch
          value={formik.values.quickMatch}
          onValueChange={(value) => {
            formik.setFieldValue("quickMatch", value);
          }}
          trackColor={{ false: "#767577", true: "#4CAF50" }}
          thumbColor={formik.values.quickMatch ? "#81C784" : "#f4f3f4"}
          ios_backgroundColor="#3e3e3e"
          style={styles.switch}
        />
      </View>
      <View style={{ flex: 1 }} />
      <Button
        textColor="white"
        buttonColor="#0c66e4"
        mode="contained"
        onPress={formik.handleSubmit as (e?: GestureResponderEvent) => void}
      >
        Start new match
      </Button>
      <Snackbar
        visible={showSnackbar}
        onDismiss={() => {
          setShowSnackbar(false);
          router.replace("/tournaments");
        }}
        duration={1000}
        style={styles.snackbar}
        theme={{
          colors: {
            inverseSurface: "#323232", // dark background
            inverseOnSurface: "#ffffff", // white text
          },
        }}
      >
        Create a new tournament to start a match
      </Snackbar>
    </View>
  );
};

const windowWidth = Dimensions.get("window").width;

const styles = StyleSheet.create({
  formContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 10,
    backgroundColor: "transparent",
  },
  input: {
    paddingHorizontal: 8,
    color: "white",
    marginBottom: 8,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 16,
  },
  quickMatchContainer: {
    flex: 1,
    flexDirection: "column",
  },
  label: {
    fontSize: 16,
    color: "#fff",
  },
  switch: {
    transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }],
  },
  quickMatch: {
    fontSize: 10,
    color: "#B3E5FC",
    paddingLeft: 0,
  },
  snackbar: {
    width: "100%",
  },
});

const lightStyles = StyleSheet.create({
  input: {
    backgroundColor: "#fff",
  },
  quickMatch: {
    fontWeight: "bold",
    color: "black",
  },
  label: {
    color: "black",
  },
});

const darkStyles = StyleSheet.create({
  input: {
    backgroundColor: "#333",
  },
  quickMatch: {
    color: "#B3E5FC",
  },
  label: {
    color: "#fff",
  },
});

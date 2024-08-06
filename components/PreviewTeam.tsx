import { team } from "@/types/team";
import React from "react";
import {
  View,
  StyleSheet,
  GestureResponderEvent,
  ScrollView,
} from "react-native";
import { Button, Dialog, List, Title, Divider } from "react-native-paper";

type Player = {
  id: string;
  name: string;
  team: "none" | "team1" | "team2";
};

interface PreviewTeamProps {
  visible: boolean;
  players: Player[];
  team1: team | undefined;
  team2: team | undefined;
  onSave: () => void;
  onDismiss: () => void;
}

const PreviewTeam: React.FC<PreviewTeamProps> = ({
  visible,
  players,
  team1,
  team2,
  onSave,
  onDismiss,
}) => {
  const unassignedPlayers = players
    .filter((player) => player.team === "none")
    .sort((a, b) => a.name.localeCompare(b.name));
  const team1Players = players
    .filter((player) => player.team === "team1")
    .sort((a, b) => a.name.localeCompare(b.name));
  const team2Players = players
    .filter((player) => player.team === "team2")
    .sort((a, b) => a.name.localeCompare(b.name));

  const onSubmit = () => {
    onSave();
    onDismiss();
  };

  return (
    <Dialog visible={visible} onDismiss={onDismiss}>
      <View>
        <Dialog.Title style={styles.headerText}>Team Preview</Dialog.Title>
      </View>
      <Divider />
      <Dialog.Content>
        <ScrollView horizontal contentContainerStyle={styles.scrollContent}>
          <View style={styles.column}>
            <Title style={styles.title}>
              {team1 ? team1.teamName : "Team 1"}
            </Title>
            <Divider style={styles.columnDivider} />
            <ScrollView style={styles.playerList}>
              {team1Players.length ? (
                team1Players.map((player) => (
                  <List.Item key={player.id} title={player.name} />
                ))
              ) : (
                <List.Item title="No players assigned" />
              )}
            </ScrollView>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.column}>
            <Title style={styles.title}>
              {team2 ? team2.teamName : "Team 2"}
            </Title>
            <Divider style={styles.columnDivider} />
            <ScrollView style={styles.playerList}>
              {team2Players.length ? (
                team2Players.map((player) => (
                  <List.Item key={player.id} title={player.name} />
                ))
              ) : (
                <List.Item title="No players assigned" />
              )}
            </ScrollView>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.column}>
            <Title style={styles.title}>Bench</Title>
            <Divider style={styles.columnDivider} />
            <ScrollView style={styles.playerList}>
              {unassignedPlayers.length ? (
                unassignedPlayers.map((player) => (
                  <List.Item key={player.id} title={player.name} />
                ))
              ) : (
                <List.Item title="-" />
              )}
            </ScrollView>
          </View>
        </ScrollView>
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={onDismiss}>Cancel</Button>
        <Button
          textColor="white"
          buttonColor="#0c66e4"
          mode="contained"
          onPress={onSubmit}
        >
          Save
        </Button>
      </Dialog.Actions>
    </Dialog>
  );
};

const styles = StyleSheet.create({
  headerText: {
    color: "white",
  },
  scrollContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  column: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 5,
  },
  title: {
    marginBottom: 10,
  },
  columnDivider: {
    marginBottom: 10,
  },
  divider: {
    height: "100%",
    width: 1,
    backgroundColor: "#ccc",
    marginHorizontal: 10,
  },
  playerList: {
    maxHeight: 300,
  },
});

export default PreviewTeam;

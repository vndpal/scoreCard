import React, { useEffect, useState } from "react";
import { View, StyleSheet, GestureResponderEvent } from "react-native";
import { Button, Dialog, HelperText } from "react-native-paper";
import { useFormik } from "formik";
import * as Yup from "yup";
import { getItem } from "@/utils/asyncStorage";
import { STORAGE_ITEMS } from "@/constants/StorageItems";
import { team } from "@/types/team";
import teams from "@/interfaces/teams";
import { Dropdown } from "react-native-paper-dropdown";
import { Team } from "@/firebase/models/Team";
import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "expo-router";

// Define validation schema with Yup
const teamSelectionSchema = Yup.object().shape({
  team1: Yup.string().required("First team is required"),
  team2: Yup.string()
    .required("Second team is required")
    .test("teams-not-equal", "The teams must be different", function (value) {
      const { team1 } = this.parent;
      return team1 !== value;
    }),
});

type items = {
  label: string;
  value: string;
};

// Define the props for the PopupForm component
interface PopupFormProps {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (values: teams) => void;
}

// Define the PopupForm component
const TeamSelection: React.FC<PopupFormProps> = ({
  visible,
  onDismiss,
  onSubmit,
}) => {
  const [items, setItems] = useState<items[]>([]);
  const [teams, setTeams] = useState<team[]>([]);
  const { club } = useTheme();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const teams = await Team.getAllByClubId(club.id);
      if (teams) {
        if (teams.length < 2) {
          router.push("/createTeam");
        } else {
          setTeams(teams);
          setItems(
            teams.map((team: team) => ({
              label: team.teamName,
              value: team.teamInitials,
            }))
          );
        }
      }
    })();
  }, []);

  const formik = useFormik({
    initialValues: {
      team1: "",
      team2: "",
    },
    validationSchema: teamSelectionSchema,
    onSubmit: async (values, { resetForm }) => {
      await handleSubmit();
    },
  });

  const handleSubmit = async () => {
    const result: teams = {
      team1: teams.find(
        (team) => team.teamInitials === formik.values.team1
      ) || {
        teamName: "",
        teamInitials: "",
        clubId: club.id,
      },
      team2: teams.find(
        (team) => team.teamInitials === formik.values.team2
      ) || {
        teamName: "",
        teamInitials: "",
        clubId: club.id,
      },
    };
    onSubmit(result);
    onDismiss();
  };

  return (
    <Dialog visible={visible} onDismiss={onDismiss}>
      <Dialog.Title>Team selection</Dialog.Title>
      <Dialog.Content>
        <View>
          <Dropdown
            label="First team"
            options={items}
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
            label="Second team"
            options={items}
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
          <Button
            textColor="white"
            buttonColor="#0c66e4"
            mode="contained"
            onPress={formik.handleSubmit as (e?: GestureResponderEvent) => void}
          >
            Start selecting players
          </Button>
        </View>
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={onDismiss}>Cancel</Button>
      </Dialog.Actions>
    </Dialog>
  );
};

const styles = StyleSheet.create({
  input: {
    marginBottom: 12,
  },
  button: {
    marginTop: 12,
  },
  error: {
    color: "red",
  },
});

export default TeamSelection;

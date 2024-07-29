import React, { useEffect, useState } from "react";
import { View, StyleSheet, GestureResponderEvent } from "react-native";
import {
  Button,
  Dialog,
  TextInput,
  Paragraph,
  HelperText,
} from "react-native-paper";
import { Formik, Field, Form, ErrorMessage, useFormik } from "formik";
import * as Yup from "yup";
import { getItem } from "@/utils/asyncStorage";
import { STORAGE_ITEMS } from "@/constants/StorageItems";
import { team } from "@/types/team";
import teams from "@/interfaces/teams";
import { Dropdown } from "react-native-paper-dropdown";

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
const PopupForm: React.FC<PopupFormProps> = ({
  visible,
  onDismiss,
  onSubmit,
}) => {
  const [items, setItems] = useState<items[]>([]);
  const [teams, setTeams] = useState<team[]>([]);

  useEffect(() => {
    (async () => {
      const teams = await getItem(STORAGE_ITEMS.TEAMS);
      if (teams) {
        setTeams(teams);
        setItems(
          teams.map((team: team) => ({
            label: team.teamName,
            value: team.teamInitials,
          }))
        );
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
      },
      team2: teams.find(
        (team) => team.teamInitials === formik.values.team2
      ) || {
        teamName: "",
        teamInitials: "",
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
            Create new team
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

export default PopupForm;

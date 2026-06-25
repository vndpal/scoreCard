import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Keyboard,
  View,
  StyleSheet,
  GestureResponderEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, TextInput, HelperText, Snackbar } from "react-native-paper";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Team } from "@/firebase/models/Team";
import { useAppContext } from "@/context/AppContext";

const editTeamSchema = Yup.object().shape({
  teamName: Yup.string().required("Team name is required"),
  teamShortName: Yup.string()
    .max(3)
    .required("Short form of the team is required"),
});

export const EditTeam = () => {
  const [isSuccess, setIsSuccess] = useState(false);
  const [team, setTeam] = useState<Team | null>(null);
  const { club } = useAppContext();
  const insets = useSafeAreaInsets();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();

  useEffect(() => {
    (async () => {
      if (!teamId) return;
      try {
        const fetched = await Team.getById(teamId);
        if (fetched) {
          setTeam(fetched);
          formik.setValues({
            teamName: fetched.teamName,
            teamShortName: fetched.teamShortName,
          });
        }
      } catch (error) {
        console.error("Error loading team for edit:", error);
      }
    })();
  }, [teamId]);

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (!team) return;

    const { teamName, teamShortName } = formik.values;

    try {
      // Reject an exact duplicate of another team (same name AND short name),
      // ignoring this team itself. teamInitials is never changed on edit.
      const duplicates = (
        await Team.findByNameAndShortName(teamName, teamShortName, club.id)
      ).filter((t) => t.id !== team.id);
      if (duplicates.length > 0) {
        alert("A team with this name and short name already exists");
        return;
      }

      await team.update({ teamName, teamShortName });

      setIsSuccess(true);
      router.back();
    } catch (error) {
      console.error("Error updating team:", error);
      alert("Failed to update the team. Please try again.");
    }
  };

  const formik = useFormik({
    initialValues: {
      teamName: "",
      teamShortName: "",
    },
    validationSchema: editTeamSchema,
    onSubmit: async () => {
      await handleSubmit();
    },
  });

  return (
    <View
      style={[
        styles.formContainer,
        { paddingBottom: insets.bottom, paddingTop: insets.top },
      ]}
    >
      <TextInput
        style={styles.input}
        label={"Team name"}
        placeholderTextColor={"white"}
        keyboardType="default"
        value={formik.values.teamName}
        onChangeText={formik.handleChange("teamName")}
        onBlur={formik.handleBlur("teamName")}
        mode="outlined"
        error={!!formik.errors.teamName && !!formik.touched.teamName}
      />
      <HelperText
        type="error"
        padding="none"
        visible={!!formik.errors.teamName && !!formik.touched.teamName}
      >
        {formik.errors.teamName}
      </HelperText>
      <TextInput
        style={styles.input}
        label={"Short form"}
        placeholderTextColor={"white"}
        keyboardType="default"
        value={formik.values.teamShortName}
        onChangeText={(text) =>
          formik.setFieldValue("teamShortName", text.toUpperCase().slice(0, 3))
        }
        onBlur={formik.handleBlur("teamShortName")}
        mode="outlined"
        error={!!formik.errors.teamShortName && !!formik.touched.teamShortName}
      />
      <HelperText
        type="error"
        padding="none"
        visible={!!formik.errors.teamShortName && !!formik.touched.teamShortName}
      >
        {formik.errors.teamShortName}
      </HelperText>
      <View style={{ flex: 1 }} />
      <Button
        textColor="white"
        buttonColor="#0c66e4"
        mode="contained"
        disabled={!team}
        onPress={formik.handleSubmit as (e?: GestureResponderEvent) => void}
      >
        Save changes
      </Button>
      <Snackbar
        visible={isSuccess}
        duration={1500}
        elevation={1}
        action={{
          label: "Ok",
          onPress: () => {
            // Do something
          },
        }}
        onDismiss={() => setIsSuccess(false)}
      >
        Team updated successfully
      </Snackbar>
    </View>
  );
};

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
  },
});

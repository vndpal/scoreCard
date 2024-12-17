import { router } from "expo-router";
import React, { useState } from "react";
import {
  Keyboard,
  View,
  StyleSheet,
  Dimensions,
  GestureResponderEvent,
} from "react-native";
import { Button, TextInput, HelperText, Snackbar } from "react-native-paper";
import { useFormik } from "formik";
import * as Yup from "yup";
import { team } from "@/types/team";
import { Team } from "@/firebase/models/Team";
import { useTheme } from "@/context/ThemeContext";

const createTeamSchema = Yup.object().shape({
  teamName: Yup.string().required("Team name is required"),
  teamInitials: Yup.string()
    .max(3)
    .required("Short form of the team is required"),
  clubId: Yup.string(),
});

export const CreateTeam = () => {
  const [isSuccess, setIsSuccess] = useState(false);
  const { club } = useTheme();

  const handleSubmit = async () => {
    Keyboard.dismiss();

    const team: team = formik.values;

    const teamExists = await Team.findByInitials(team.teamInitials);
    if (teamExists.length > 0) {
      alert("Team with this name already exists");
      return;
    }

    team.clubId = club.id;

    await Team.create(team);

    setIsSuccess(true);
    router.push("/explore");
  };

  const formik = useFormik({
    initialValues: {
      teamName: "",
      teamInitials: "",
      clubId: "",
    },
    validationSchema: createTeamSchema,
    onSubmit: async (values, { resetForm }) => {
      await handleSubmit();
    },
  });

  return (
    <View style={styles.formContainer}>
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
        value={formik.values.teamInitials}
        onChangeText={(text) =>
          formik.setFieldValue("teamInitials", text.toUpperCase().slice(0, 3))
        }
        onBlur={formik.handleBlur("teamInitials")}
        mode="outlined"
        error={!!formik.errors.teamInitials && !!formik.touched.teamInitials}
      />
      <HelperText
        type="error"
        padding="none"
        visible={!!formik.errors.teamInitials && !!formik.touched.teamInitials}
      >
        {formik.errors.teamInitials}
      </HelperText>
      <View style={{ flex: 1 }} />
      <Button
        textColor="white"
        buttonColor="#0c66e4"
        mode="contained"
        onPress={formik.handleSubmit as (e?: GestureResponderEvent) => void}
      >
        Create new team
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
        Team created successfully
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
  },
});

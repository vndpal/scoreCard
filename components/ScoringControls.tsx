import React from "react";
import {
    StyleSheet,
    View,
    TouchableOpacity,
    Text,
    Dimensions,
} from "react-native";
import { Icon } from "react-native-elements";
import { useAppContext } from "@/context/AppContext";

const windowWidth = Dimensions.get("window").width;

interface ScoringControlsProps {
    possibleRuns: string[];
    run: number;
    isDeclared: boolean;
    isEntryDone: boolean;
    showLoader: boolean;
    isWicket: boolean;
    isNoBall: boolean;
    isWideBall: boolean;
    matchStatus: string;
    onRunPress: (score: string) => void;
    onWicketPress: () => void;
    onNoBallPress: () => void;
    onWideBallPress: () => void;
    onUndoPress: () => void;
    onSettingsPress: () => void;
}

export default function ScoringControls({
    possibleRuns,
    run,
    isDeclared,
    isEntryDone,
    showLoader,
    isWicket,
    isNoBall,
    isWideBall,
    matchStatus,
    onRunPress,
    onWicketPress,
    onNoBallPress,
    onWideBallPress,
    onUndoPress,
    onSettingsPress,
}: ScoringControlsProps) {
    const { currentTheme } = useAppContext();
    const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

    return (
        <View>
            <View style={[styles.scoreContainer, themeStyles.scoreContainer]}>
                {possibleRuns.map((score, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[
                            styles.bubbleButton,
                            themeStyles.bubbleButton,
                            isEntryDone &&
                            run == parseInt(score) &&
                            (isDeclared ? score.includes("d") : !score.includes("d")) && {
                                backgroundColor: "#019999",
                            },
                        ]}
                        disabled={showLoader}
                        onPress={() => onRunPress(score)}
                    >
                        <Text style={styles.buttonText}>{score}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <View style={[styles.scoreContainer, themeStyles.scoreContainer]}>
                <TouchableOpacity
                    style={[
                        styles.specialBubbleButton,
                        isWicket && { backgroundColor: "#019999" },
                    ]}
                    disabled={showLoader}
                    onPress={onWicketPress}
                >
                    <Text style={styles.buttonText}>Out</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.specialBubbleButton,
                        isNoBall && { backgroundColor: "#019999" },
                    ]}
                    disabled={showLoader}
                    onPress={onNoBallPress}
                >
                    <Text style={styles.buttonText}>NoBall</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.specialBubbleButton,
                        isWideBall && { backgroundColor: "#019999" },
                    ]}
                    disabled={showLoader}
                    onPress={onWideBallPress}
                >
                    <Text style={styles.buttonText}>Wide</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    disabled={showLoader}
                    style={[styles.specialBubbleButton]}
                    onPress={onUndoPress}
                >
                    <Icon name="delete" type="feather" color="black" size={28} />
                </TouchableOpacity>
                <TouchableOpacity
                    disabled={matchStatus !== "live"}
                    style={styles.specialBubbleButton}
                    onPress={onSettingsPress}
                >
                    <Icon name="settings" type="ionicon" color="black" size={28} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    scoreContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        margin: 1,
        padding: 2,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.2)",
        backgroundColor: "rgba(50, 50, 50, 0.8)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 5,
        elevation: 3,
    },
    bubbleButton: {
        margin: 6,
        width: windowWidth * 0.12,
        height: windowWidth * 0.12,
        borderRadius: windowWidth * 0.1,
        backgroundColor: "#ddd",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 0.5,
        borderColor: "#aaa",
    },
    specialBubbleButton: {
        marginVertical: 6,
        marginHorizontal: 4,
        width: windowWidth * 0.17,
        height: windowWidth * 0.1,
        backgroundColor: "#e2e6ea",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 0.5,
        borderColor: "#d3d9e0",
    },
    buttonText: {
        fontSize: 14,
        fontWeight: "900",
        color: "#343a40",
        letterSpacing: 0.2,
        textAlign: "center",
    },
});

const darkStyles = StyleSheet.create({
    scoreContainer: {
        backgroundColor: "#333",
        borderColor: "#555",
    },
    bubbleButton: {
        backgroundColor: "#ddd",
        borderColor: "#aaa",
    },
});

const lightStyles = StyleSheet.create({
    scoreContainer: {
        backgroundColor: "#ffffff",
        borderWidth: 2,
        borderColor: "#e0e0e0",
    },
    bubbleButton: {
        backgroundColor: "#e2e6ea",
        borderColor: "##d3d9e0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 0.5,
    },
});

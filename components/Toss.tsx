import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';

const Toss: React.FC = () => {
    const [coinSide, setCoinSide] = useState("TOSS");

    const flipAnimation = useRef(new Animated.Value(0)).current;

    const flipCoin = () => {

        Animated.timing(flipAnimation, {
            toValue: 8,
            duration: 1000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
        }).start(() => {
            flipAnimation.setValue(0);
            if (Math.random() < 0.5) {
                setCoinSide("H");
            } else {
                setCoinSide("T");
            }
        });
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={flipCoin}>
                {(
                    <Animated.View
                        style={[
                            styles.coinImage,
                            {
                                transform: [
                                    {
                                        rotateX: flipAnimation.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: ["0deg", "180deg"],
                                        }),
                                    },
                                    {
                                        scale: flipAnimation.interpolate({
                                            inputRange: [0, 0.5, 1],
                                            outputRange: [1, 1.17, 1],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    >
                        <View style={[styles.coin, coinSide === "T" ? styles.tails : coinSide === "H" ? styles.heads : styles.default]}>
                            <Text style={styles.coinBorder}></Text>
                            <Text style={coinSide === "TOSS" ? styles.defaultCoinText : styles.coinText}>{coinSide}</Text>
                        </View>
                    </Animated.View>
                )}
            </TouchableOpacity>
        </View >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    coinImage: {
        width: 300,
        height: 300,
    },
    coin: {
        width: 300,
        height: 300,
        borderRadius: 150,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heads: {
        backgroundColor: 'gold',
    },
    tails: {
        backgroundColor: 'lightblue',
    },
    default: {
        backgroundColor: 'white',
    },
    coinText: {
        fontSize: 200,
        fontWeight: 'bold',
        color: 'black',
    },
    defaultCoinText: {
        flexWrap: 'wrap',
        fontSize: 70,
        fontWeight: 'bold',
        color: 'black',
    },
    coinBorder: {
        width: 276,
        height: 276,
        borderRadius: 138,
        borderWidth: 1.5,
        borderColor: 'black',
        position: 'absolute',
        borderStyle: 'dashed',

    }
});

export default Toss;
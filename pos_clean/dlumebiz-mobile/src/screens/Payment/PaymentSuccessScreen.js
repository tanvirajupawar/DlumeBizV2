import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import COLORS from "../../constants/colors";
import Svg, { Circle } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function PaymentSuccessScreen({ route, navigation }) {
  const { amount, routes } = route.params;

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;
  const circleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Sequence of animations
    Animated.sequence([
      // 1. Circle draws in
      Animated.timing(circleAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // 2. Icon pops in with spring
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    // Checkmark draw animation (slightly delayed)
    setTimeout(() => {
      Animated.timing(checkAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        // Pulse effect after check appears
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 200,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 200);

    // Text slides in
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }, 500);

    let timer;

    if(routes === "Customers"){
       timer = setTimeout(() => {
        navigation.replace('Customers');
      }, 2800);

    } else {
       timer = setTimeout(() => {
        navigation.replace('Vendors');
      }, 2800);

    }

   

    return () => clearTimeout(timer);
  }, []);

  const circumference = 2 * Math.PI * 42;
  const strokeDashoffset = circleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        {/* ANIMATED CIRCLE + CHECK ICON */}
        <Animated.View
          style={[
            styles.iconWrapper,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          {/* SVG Circle Animation */}
          <Svg
            width="96"
            height="96"
            style={styles.svgCircle}
          >
            <AnimatedCircle
              cx="48"
              cy="48"
              r="42"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="4"
              fill="none"
            />
            <AnimatedCircle
              cx="48"
              cy="48"
              r="42"
              stroke="#FFFFFF"
              strokeWidth="4"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation="-90"
              origin="48, 48"
            />
          </Svg>

          {/* Checkmark Icon */}
          <Animated.View
            style={[
              styles.checkIcon,
              {
                opacity: checkAnim,
                transform: [
                  { scale: scaleAnim },
                  {
                    translateY: checkAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Ionicons name="checkmark" size={54} color="#FFFFFF" />
          </Animated.View>
        </Animated.View>

        {/* TEXT */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.title}>Payment Successful</Text>
          <Text style={styles.subtitle}>Transaction completed</Text>
          <Text style={styles.amount}>₹{amount}</Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.SUCCESS,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  iconWrapper: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },

  svgCircle: {
    position: "absolute",
  },

  checkIcon: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },

  textContainer: {
    alignItems: "center",
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
    letterSpacing: 0.5,
  },

  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 20,
    fontWeight: "500",
  },

  amount: {
    fontSize: 40,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
});
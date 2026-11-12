import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import COLORS from "../../constants/colors";

export default function PaymentFailScreen({ route, navigation }) {
  const { amount, reason = "Transaction failed", routes } = route.params;

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const buttonSlide = useRef(new Animated.Value(30)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Sequence of animations
    Animated.sequence([
      // Error icon pop in with shake
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 40,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(shakeAnim, {
            toValue: 10,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: -10,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 10,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
      ]),
      // Fade in text and slide up
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      // Buttons slide up
      Animated.spring(buttonSlide, {
        toValue: 0,
        tension: 70,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleRetry = () => {
    navigation.replace(routes);
  };

  const handleCancel = () => {
    navigation.replace(routes);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Animated.View
          style={[
            styles.iconWrapper,
            { 
              transform: [
                { scale: scaleAnim },
                { translateX: shakeAnim }
              ] 
            },
          ]}
        >
          <Ionicons
            name="close"
            size={48}
            color="#FFFFFF"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.title}>Payment Failed</Text>
          <Text style={styles.subtitle}>{reason}</Text>
          <Text style={styles.amount}>₹{amount}</Text>
        </Animated.View>

        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: buttonSlide }],
            width: '100%',
            alignItems: 'center',
          }}
        >
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={handleRetry}
            activeOpacity={0.85}
          >
            <Ionicons
              name="refresh"
              size={18}
              color={COLORS.ERROR || "#DC2626"}
              style={styles.retryIcon}
            />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  /* ================= CONTAINER ================= */
  container: {
    flex: 1,
    backgroundColor: COLORS.ERROR || "#DC2626", // solid error red
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  /* ================= ICON ================= */
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },

  /* ================= TEXT ================= */
  textContainer: {
    alignItems: "center",
    marginBottom: 32,
  },

  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
    letterSpacing: 0.2,
  },

  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "500",
    marginBottom: 20,
    textAlign: "center",
  },

  amount: {
    fontSize: 36,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },

  /* ================= BUTTONS ================= */
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 24,
    marginBottom: 16,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
  },

  retryText: {
    color: COLORS.ERROR || "#DC2626",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.3,
    marginLeft: 6,
  },

  retryIcon: {
    marginTop: 1,
  },

  cancelBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },

  cancelText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
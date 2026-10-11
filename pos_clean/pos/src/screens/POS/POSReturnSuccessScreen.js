import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function POSReturnSuccessScreen({ route, navigation }) {
  const {
    returnNo = "",
    amount = 0,
    outstanding = 0,
    customerName = "Customer",
  } = route.params || {};

  const scale = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, fade]);

  const money = (value) =>
    Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });


const handleDone = () => {
  navigation.goBack();
};

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F8FC" />

      <View style={styles.container}>
        <Animated.View
          style={[
            styles.successCircle,
            { transform: [{ scale }] },
          ]}
        >
          <MaterialCommunityIcons
            name="check"
            size={58}
            color="#FFFFFF"
          />
        </Animated.View>

        <Animated.View style={{ opacity: fade, alignItems: "center" }}>
          <Text style={styles.title}>Return Successful!</Text>
          <Text style={styles.subtitle}>
            The customer return has been processed successfully.
          </Text>

          <View style={styles.card}>
            <Text style={styles.label}>RETURN AMOUNT</Text>
            <Text style={styles.amount}>₹{money(amount)}</Text>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Return No.</Text>
              <Text style={styles.detailValue}>{returnNo || "—"}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Customer</Text>
              <Text style={styles.detailValue}>{customerName}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Outstanding After Return</Text>
              <Text style={styles.detailValue}>
                ₹{money(outstanding)}
              </Text>
            </View>

            <View style={styles.statusPill}>
              <MaterialCommunityIcons
                name="check-circle"
                size={17}
                color="#15803D"
              />
              <Text style={styles.statusText}>Completed</Text>
            </View>
          </View>
        </Animated.View>

        <TouchableOpacity
          style={styles.doneButton}
          onPress={handleDone}
          activeOpacity={0.85}
        >
          <Text style={styles.doneButtonText}>Done</Text>
          <MaterialCommunityIcons
            name="arrow-right"
            size={21}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F6F8FC",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 25,
    elevation: 8,
  },
  title: {
    fontSize: 29,
    fontWeight: "800",
    color: "#172033",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 25,
  },
  card: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 25,
    elevation: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 1.5,
    textAlign: "center",
  },
  amount: {
    fontSize: 36,
    fontWeight: "800",
    color: "#15803D",
    textAlign: "center",
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 22,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 17,
  },
  detailLabel: {
    flex: 1,
    fontSize: 14,
    color: "#64748B",
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#172033",
    textAlign: "right",
  },
  statusPill: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 25,
    marginTop: 5,
  },
  statusText: {
    color: "#15803D",
    fontWeight: "700",
  },
  doneButton: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#16A34A",
    borderRadius: 14,
    paddingVertical: 17,
    paddingHorizontal: 22,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginTop: 28,
  },
  doneButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
});

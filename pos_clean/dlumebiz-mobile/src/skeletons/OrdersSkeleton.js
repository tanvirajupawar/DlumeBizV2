import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import COLORS from "../../constants/colors";

export default function OrdersSkeleton() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.7],
  });

  const Block = ({ style }) => (
    <Animated.View
      style={[styles.block, style, { opacity }]}
    />
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Block style={{ width: 120, height: 18 }} />
          <Block style={{ width: 90, height: 12, marginTop: 6 }} />
        </View>
        <View>
          <Block style={{ width: 80, height: 12 }} />
          <Block style={{ width: 100, height: 18, marginTop: 6 }} />
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <Block style={styles.tab} />
        <Block style={styles.tab} />
      </View>

      {/* Date chip */}
      <Block style={styles.dateChip} />

      {/* List */}
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={i} style={styles.card}>
          <Block style={{ width: "60%", height: 14 }} />
          <Block style={{ width: "40%", height: 11, marginTop: 6 }} />

          <View style={styles.cardRight}>
            <Block style={{ width: 80, height: 14 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BG,
  },

  block: {
    backgroundColor: COLORS.BORDER_SOFT,
    borderRadius: 6,
  },

  header: {
    backgroundColor: "#fff",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },

  tabs: {
    flexDirection: "row",
    padding: 16,
    gap: 8,
  },

  tab: {
    flex: 1,
    height: 36,
  },

  dateChip: {
    width: 120,
    height: 28,
    marginLeft: 16,
    borderRadius: 14,
  },

  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },

  cardRight: {
    alignItems: "flex-end",
    marginTop: 12,
  },
});

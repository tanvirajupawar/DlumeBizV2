import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions } from "react-native";
import COLORS from "../../constants/colors";

const { width } = Dimensions.get("window");

/* ---------- SHIMMER BLOCK ---------- */
const SkeletonBlock = ({ style }) => {
  const shimmer = useRef(new Animated.Value(-width)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: width,
        duration: 1200,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  return (
    <View style={[styles.block, style]}>
      <Animated.View
        style={[
          styles.shimmer,
          { transform: [{ translateX: shimmer }] },
        ]}
      />
    </View>
  );
};


export default function DashboardSkeleton() {
  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <SkeletonBlock style={styles.lineSm} />
        <SkeletonBlock style={styles.lineLg} />
        <SkeletonBlock style={styles.lineXs} />
      </View>

      {/* QUICK ACTIONS */}
      <View style={styles.quickActions}>
        <SkeletonBlock style={styles.actionCard} />
        <SkeletonBlock style={styles.actionCard} />
      </View>

      {/* PIE CHART CARD */}
      <View style={styles.card}>
        <SkeletonBlock style={styles.cardTitle} />
        <View style={styles.pieWrap}>
          <SkeletonBlock style={styles.pie} />
        </View>

        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={styles.legendRow}>
            <SkeletonBlock style={styles.legendDot} />
            <SkeletonBlock style={styles.legendLine} />
            <SkeletonBlock style={styles.legendValue} />
          </View>
        ))}
      </View>

      {/* ANALYSIS CARD */}
      <View style={styles.card}>
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={i} style={styles.analysisRow}>
            <SkeletonBlock style={styles.analysisLabel} />
            <SkeletonBlock style={styles.analysisValue} />
          </View>
        ))}

        <SkeletonBlock style={styles.bar} />

        <SkeletonBlock style={styles.netBox} />
      </View>

      {/* INSIGHT STRIP */}
      <SkeletonBlock style={styles.insightStrip} />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BG,
    paddingBottom: 20,
  },

  /* BASE BLOCK */
  block: {
    backgroundColor: "#E6EAF0", // softer grey
    overflow: "hidden",
  },

  shimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "45%",
    backgroundColor: "rgba(255,255,255,0.5)",
    opacity: 0.6,
  },

  /* HEADER */
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    backgroundColor: "#F1F5F9",
    gap: 12,
  },
  lineSm: {
    width: "35%",
    height: 14,
    borderRadius: 6,
  },
  lineLg: {
    width: "65%",
    height: 22,
    borderRadius: 8,
  },
  lineXs: {
    width: "45%",
    height: 12,
    borderRadius: 6,
  },

  /* QUICK ACTIONS */
  quickActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  actionCard: {
    flex: 1,
    height: 110,
    borderRadius: 18,
  },

  /* CARD */
  card: {
    backgroundColor: COLORS.BG,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 14,
  },

  cardTitle: {
    width: "45%",
    height: 18,
    borderRadius: 8,
  },

  /* PIE */
  pieWrap: {
    alignItems: "center",
    marginVertical: 14,
  },
  pie: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },

  /* LEGEND */
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendLine: {
    flex: 1,
    height: 14,
    borderRadius: 6,
  },
  legendValue: {
    width: 26,
    height: 14,
    borderRadius: 6,
  },

  /* ANALYSIS */
  analysisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  analysisLabel: {
    width: "38%",
    height: 14,
    borderRadius: 6,
  },
  analysisValue: {
    width: "28%",
    height: 16,
    borderRadius: 6,
  },
  bar: {
    height: 6,
    borderRadius: 6,
    marginTop: 12,
  },
  netBox: {
    height: 56,
    borderRadius: 14,
    marginTop: 12,
  },

  /* INSIGHT */
  insightStrip: {
    height: 64,
    borderRadius: 18,
    marginHorizontal: 16,
    marginTop: 16,
  },
});

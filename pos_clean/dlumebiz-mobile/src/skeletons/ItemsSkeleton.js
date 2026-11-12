import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import COLORS from "../../constants/colors";

export default function ItemsSkeleton() {
  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.title} />
        <View style={styles.totalBox} />
      </View>

      {/* TOP BAR */}
      <View style={styles.topBar}>
        <View style={styles.search} />
        <View style={styles.button} />
      </View>

      {/* TABLE HEADER */}
      <View style={styles.tableHeader} />

      {/* ROWS */}
      <ScrollView>
        {Array.from({ length: 7 }).map((_, index) => (
          <View key={index} style={styles.row}>
            {/* LEFT */}
            <View style={styles.left}>
              <View style={styles.accent} />
              <View style={styles.textBlock}>
                <View style={styles.lineLg} />
                <View style={styles.lineSm} />
              </View>
            </View>

            {/* RIGHT */}
            <View style={styles.right}>
              <View style={styles.amount} />
              <View style={styles.payBtn} />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BG,
  },

  header: {
    padding: 16,
    backgroundColor: COLORS.SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
    gap: 10,
  },
  title: {
    width: 120,
    height: 20,
    borderRadius: 6,
    backgroundColor: COLORS.BORDER_SOFT,
  },
  totalBox: {
    width: 140,
    height: 16,
    borderRadius: 6,
    backgroundColor: COLORS.BORDER_SOFT,
    alignSelf: "flex-end",
  },

  topBar: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    backgroundColor: COLORS.SURFACE,
  },
  search: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.BORDER_SOFT,
  },
  button: {
    width: 140,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.BORDER_SOFT,
  },

  tableHeader: {
    height: 30,
    backgroundColor: COLORS.BORDER_SOFT,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
    backgroundColor: COLORS.SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },

  left: {
    flexDirection: "row",
    gap: 10,
    flex: 1,
  },
  accent: {
    width: 4,
    borderRadius: 2,
    backgroundColor: COLORS.BORDER_SOFT,
  },
  textBlock: {
    flex: 1,
    gap: 6,
  },
  lineLg: {
    width: "70%",
    height: 14,
    borderRadius: 6,
    backgroundColor: COLORS.BORDER_SOFT,
  },
  lineSm: {
    width: "50%",
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.BORDER_SOFT,
  },

  right: {
    alignItems: "flex-end",
    gap: 8,
  },
  amount: {
    width: 80,
    height: 14,
    borderRadius: 6,
    backgroundColor: COLORS.BORDER_SOFT,
  },
  payBtn: {
    width: 70,
    height: 28,
    borderRadius: 6,
    backgroundColor: COLORS.BORDER_SOFT,
  },
});

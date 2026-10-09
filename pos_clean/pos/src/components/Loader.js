import React from "react";
import { ActivityIndicator, View, Text, StyleSheet } from "react-native";

/**
 * Reusable loader.
 *
 * Props:
 *  - size:    "small" | "large" | number   (default "small")
 *  - color:   spinner color                (default "#fff")
 *  - label:   optional text next to spinner
 *  - style:   container style override
 */
export default function Loader({
  size = "small",
  color = "#FFFFFF",
  label,
  style,
}) {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={color} />
      {label ? (
        <Text style={[styles.label, { color }]}>{label}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "600",
  },
});
import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";

/**
 * Loading state for the Product List screen.
 */
const LoadingProducts = () => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2563EB" />
      <Text style={styles.text}>Loading products...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  text: {
    marginTop: 14,
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
});

export default LoadingProducts;
import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import Loader from "./Loader";

export default function Button({
  title,
  onPress,
  loading = false,
  loadingText,
  disabled = false,
}) {
  return (
    <TouchableOpacity
      style={[styles.button, (disabled || loading) && styles.disabled]}
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <Loader label={loadingText} />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#1E3A8A",
    height: 55,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  disabled: {
    opacity: 0.6,
  },

  text: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
});
import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";

import Loader from "./Loader";

/**
 * White button for use in navy headers (Save, Done, Add, etc.)
 *
 * Props:
 *  - title:    button text
 *  - onPress:  handler (may be async)
 *  - loading:  show spinner and block presses
 *  - disabled: disable the button
 *  - style / textStyle: overrides
 */
export default function HeaderButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  style,
  textStyle,
  testID,
}) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      hitSlop={8}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <Loader color="#23408E" />
      ) : (
        <Text style={[styles.text, textStyle]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 76,
    height: 38,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.7,
  },
  text: {
    color: "#23408E",
    fontSize: 16,
    fontWeight: "700",
  },
});
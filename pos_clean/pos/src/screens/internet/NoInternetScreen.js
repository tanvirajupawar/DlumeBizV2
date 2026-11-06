import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

import NetInfo from "@react-native-community/netinfo";

const NoInternetScreen = () => {
  const handleRetry = async () => {
    await NetInfo.fetch();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📡</Text>

      <Text style={styles.title}>
        No Internet Connection
      </Text>

      <Text style={styles.description}>
        Unable to connect to the internet.
        Please check your network and try again.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={handleRetry}
      >
        <Text style={styles.buttonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  icon: {
    fontSize: 65,
    marginBottom: 25,
  },
  title: {
    fontSize: 23,
    fontWeight: "700",
    color: "#222222",
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: "#777777",
    textAlign: "center",
    lineHeight: 23,
    marginBottom: 30,
  },
  button: {
    backgroundColor: "#222222",
    paddingVertical: 14,
    paddingHorizontal: 45,
    borderRadius: 10,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});

export default NoInternetScreen;
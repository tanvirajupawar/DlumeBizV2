import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { useAuth } from "../../context/AuthContext";
import { loginUser } from "../../api/auth";

import Input from "../../components/Input";
import Button from "../../components/Button";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const navigation = useNavigation();
  const { login } = useAuth();

const handleLogin = async () => {
  if (!username || !password) {
    Alert.alert("Validation", "Please enter username and password");
    return;
  }

try {
  console.log("Username:", username);

  const response = await loginUser(username, password);

  console.log(
  "🔥 V2 LOGIN USER:",
  JSON.stringify(response.data.user, null, 2)
);

  await login({
    userData: response.data.user,
    accessToken: response.data.accessToken,
  });

  navigation.replace("POS");
} catch (error) {
  console.log("FULL ERROR:", error);
  console.log("ERROR MESSAGE:", error.message);
  console.log("ERROR CODE:", error.code);
  console.log("ERROR RESPONSE:", error.response?.data);

  Alert.alert(
    "Login Failed",
    error.response?.data?.message || error.message || "Unknown Error"
  );
}
};

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.wrapper}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.logoContainer}>
            <MaterialCommunityIcons
              name="file-document-outline"
              size={34}
              color="#fff"
            />
          </View>

          <Text style={styles.title}>
            Login to Your Account
          </Text>

          <Text style={styles.subtitle}>
            Welcome back to D&apos;LumeBiz
          </Text>

          <View style={{ marginTop: 18 }}>
            <Input
              label="Email / Mobile"
              placeholder="Enter email or mobile number"
              value={username}
              onChangeText={setUsername}
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <View style={{ marginTop: 8 }}>
            <Button
              title="Sign In"
              onPress={handleLogin}
            />
          </View>

          <View style={styles.divider} />

          <Text style={styles.footer}>
            Don't have an account?{" "}
            <Text style={styles.signup}>Sign up</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },

  scroll: {
    flex: 1,
  },

  wrapper: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  card: {
    width: "100%",
    maxWidth: 500,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 30,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
  },

  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: "#23408E",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 22,
  },

  title: {
    fontSize: 34,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },

  subtitle: {
    fontSize: 16,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 15,
  },

  divider: {
    marginTop: 28,
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
  },

  footer: {
    textAlign: "center",
    marginTop: 24,
    fontSize: 16,
    color: "#6B7280",
  },

  signup: {
    fontWeight: "700",
    color: "#111827",
  },
});
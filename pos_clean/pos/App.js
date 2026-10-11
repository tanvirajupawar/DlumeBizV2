
import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import {
  NavigationContainer,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "./src/screens/Login/LoginScreen";
import POSScreen from "./src/screens/POS/POSScreen";
import CheckoutScreen from "./src/screens/Payment/CheckoutScreen";
import POSPaymentSuccessScreen from "./src/screens/Payment/POSPaymentSuccessScreen";
import CreditSummaryScreen from "./src/screens/Payment/CreditSummaryScreen";
import POSReturnSuccessScreen from "./src/screens/POS/POSReturnSuccessScreen";

import {
  AuthProvider,
  useAuth,
} from "./src/context/AuthContext";

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user, isLoading } = useAuth();

if (isLoading) {
  return null;
}

  return (
    <NavigationContainer>
      <Stack.Navigator
        key={user ? "authenticated" : "unauthenticated"}
        initialRouteName={user ? "POS" : "Login"}
        screenOptions={{ headerShown: false }}
      >
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="POS" component={POSScreen} />
            <Stack.Screen name="Checkout" component={CheckoutScreen} />
            <Stack.Screen
              name="POSPaymentSuccess"
              component={POSPaymentSuccessScreen}
            />
            <Stack.Screen
              name="CreditSummary"
              component={CreditSummaryScreen}
            />
            <Stack.Screen
              name="POSReturnSuccess"
              component={POSReturnSuccessScreen}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
});

import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "./src/screens/Login/LoginScreen";
import POSScreen from "./src/screens/POS/POSScreen";
import CheckoutScreen from "./src/screens/Payment/CheckoutScreen";
import POSPaymentSuccessScreen from "./src/screens/Payment/POSPaymentSuccessScreen";
import CreditSummaryScreen from "./src/screens/Payment/CreditSummaryScreen";

import { AuthProvider } from "./src/context/AuthContext";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
<Stack.Screen name="Login" component={LoginScreen} />
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
</Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}

import "react-native-gesture-handler";

import React from "react";
import { View, Text, StyleSheet, StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "./src/screens/Login/LoginScreen";
import SplashScreen from "./src/screens/SplashScreen/SplashScreen";
import MainLayout from "./src/layouts/MainLayout";
import SaleOrdersListScreen from "./src/screens/Sales/SaleOrdersListScreen";
import CustomersScreen from "./src/screens/Customer/CustomersScreen";
import CustomerDetailsScreen from "./src/screens/Customer/CustomerDetailsScreen";
import PaymentScreen from "./src/screens/Payment/paymentscreen";
import PaymentSuccessScreen from "./src/screens/Payment/PaymentSuccessScreen";
import PaymentFailScreen from "./src/screens/Payment/PaymentFailScreen";

const Stack = createNativeStackNavigator();

function DashboardScreen() {
  return (
    <MainLayout currentRoute="Home">
      <View style={styles.dashboard}>
        {/* Empty dashboard for now */}
      </View>
    </MainLayout>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <StatusBar
          barStyle="light-content"
          backgroundColor="#1E293B"
        />

        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Home" component={DashboardScreen} />
          <Stack.Screen
  name="SaleOrders"
  component={SaleOrdersListScreen}
/>
          <Stack.Screen
  name="Customers"
  component={CustomersScreen}
/>
          <Stack.Screen
  name="CustomerDetails"
  component={CustomerDetailsScreen}
/>

<Stack.Screen
  name="PaymentScreen"
  component={PaymentScreen}
/>

<Stack.Screen
  name="PaymentSuccess"
  component={PaymentSuccessScreen}
/>

<Stack.Screen
  name="PaymentFailed"
  component={PaymentFailScreen}
/>
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  dashboard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
});

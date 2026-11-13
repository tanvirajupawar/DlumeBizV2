
import { View, StyleSheet, Animated } from "react-native";
import { useEffect, useRef } from "react";
import { getUser } from "../../api/AuthApi";

export default function SplashScreen({ navigation }) {
  const scale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.timing(scale, {
      toValue: 1.25,
      duration: 900,
      useNativeDriver: true,
    }).start(async () => {
      try {
        const user = await getUser();

      if (user) {
  navigation.replace("Customers");
} else {
  navigation.replace("Login");
}
      } catch (err) {
        navigation.replace("Login");
      }
    });
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require("../../../assets/splash-icon.png")}
        style={[styles.logo, { transform: [{ scale }] }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E63F3",
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 150,
    height: 150,
  },
});

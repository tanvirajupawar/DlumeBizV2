
import { View, StyleSheet, Animated } from "react-native";
import { useEffect, useRef } from "react";
import { getUser, getToken } from "../../api/AuthApi";

export default function SplashScreen({ navigation }) {
  const scale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const [token, user] = await Promise.all([
          getToken(),
          getUser(),
        ]);

        if (!isMounted) return;

        if (token && user) {
          navigation.replace("Customers");
        } else {
          navigation.replace("Login");
        }
      } catch (error) {
        console.log("SESSION RESTORE ERROR:", error);
        
        if (isMounted) {
          navigation.replace("Login");
        }
      }
    };

    Animated.timing(scale, {
      toValue: 1.25,
      duration: 900,
      useNativeDriver: true,
    }).start(() => {
      checkSession();
    });

    return () => {
      isMounted = false;
    };
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

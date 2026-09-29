import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logoutUser } from "../api/auth";
import { setAuthToken } from "../api/axios";


const AuthContext = createContext(null);

const AUTH_STORAGE_KEY = "dlumebiz_auth";



export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  useEffect(() => {
  const restoreSession = async () => {
    try {
      const storedAuth = await AsyncStorage.getItem(AUTH_STORAGE_KEY);

      if (!storedAuth) {
        return;
      }

      const parsedAuth = JSON.parse(storedAuth);

setUser(parsedAuth.user);
setAccessToken(parsedAuth.accessToken);
setAuthToken(parsedAuth.accessToken);
    } catch (error) {
      console.error("❌ Failed to restore session:", error);
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    }
  };

  restoreSession();
}, []);

  const login = async ({ userData, accessToken }) => {
setUser(userData);
setAccessToken(accessToken);
setAuthToken(accessToken);

    await AsyncStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        user: userData,
        accessToken,
      })
    );
  };

const logout = async () => {
  try {
    await logoutUser();
  } catch (error) {
    console.log("❌ Logout API error:", error.message);
  }

setUser(null);
setAccessToken(null);
setAuthToken(null);

  await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
};

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
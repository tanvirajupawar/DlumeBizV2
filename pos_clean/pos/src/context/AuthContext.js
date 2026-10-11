
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logoutUser } from "../api/auth";
import API, { setAuthToken } from "../api/axios";

const AuthContext = createContext(null);

const AUTH_STORAGE_KEY = "dlumebiz_auth";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [company, setCompany] = useState(null);
  const [companyLoading, setCompanyLoading] = useState(false);

  // Keep navigation from redirecting before session restoration finishes.
  const [isLoading, setIsLoading] = useState(true);

  const fetchCompany = async () => {
    try {
      setCompanyLoading(true);

      const response = await API.get("/companies/me");

      const companyData =
        response.data?.data ||
        response.data?.company ||
        response.data;

      setCompany(companyData);
      return companyData;
    } catch (error) {
      console.error(
        "❌ Failed to fetch company:",
        error.response?.data || error.message
      );

      return null;
    } finally {
      setCompanyLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const storedAuth = await AsyncStorage.getItem(AUTH_STORAGE_KEY);

        if (!storedAuth) {
          setAuthToken(null);
          return;
        }

        const parsedAuth = JSON.parse(storedAuth);

        if (!parsedAuth?.user || !parsedAuth?.accessToken) {
          console.warn("⚠️ Saved session is incomplete.");
          await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
          setAuthToken(null);
          return;
        }

        if (!isMounted) return;

        setAuthToken(parsedAuth.accessToken);
        setUser(parsedAuth.user);
        setAccessToken(parsedAuth.accessToken);
        setCompany(parsedAuth.user?.company || null);

        console.log("✅ Saved login session restored.");
      } catch (error) {
        console.error("❌ Failed to restore session:", error);

        // Remove storage only if it cannot be read or parsed.
        try {
          await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        } catch (storageError) {
          console.error("❌ Failed to clear invalid session:", storageError);
        }

        setAuthToken(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async ({ userData, accessToken }) => {
    // Save first so the session is persisted before considering login complete.
    await AsyncStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        user: userData,
        accessToken,
      })
    );

    setAuthToken(accessToken);
    setUser(userData);
    setAccessToken(accessToken);
    setCompany(userData?.company || null);
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.log("❌ Logout API error:", error.message);
    }

    // Explicit logout clears the locally saved session.
    setUser(null);
    setAccessToken(null);
    setCompany(null);
    setAuthToken(null);

    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (error) {
      console.error("❌ Failed to clear saved session:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        company,
        companyLoading,
        isLoading,
        fetchCompany,
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


import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import VARIABLE from "../constants/variables";

// =====================================
// AXIOS CONFIGURATION
// =====================================

const api = axios.create({
  baseURL: VARIABLE.API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Separate client for refresh requests
const refreshApi = axios.create({
  baseURL: VARIABLE.API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// =====================================
// TOKEN MANAGEMENT
// =====================================

let refreshPromise = null;

export const getToken = async () => {
  return await AsyncStorage.getItem("token");
};

export const getUser = async () => {
  const user = await AsyncStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};

export const getCompany = async () => {
  const company = await AsyncStorage.getItem("company");
  return company ? JSON.parse(company) : null;
};

export const saveAuthData = async (user, accessToken) => {
  await AsyncStorage.setItem("token", accessToken);
  await AsyncStorage.setItem("user", JSON.stringify(user));
  await AsyncStorage.setItem(
    "company",
    JSON.stringify(user?.company || null)
  );
};

// =====================================
// REQUEST INTERCEPTOR
// =====================================

api.interceptors.request.use(
  async (config) => {
    const token = await getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// =====================================
// REFRESH ACCESS TOKEN
// =====================================

export const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await refreshApi.post("/auth/refresh");

        const newToken = response.data?.data?.accessToken;

        if (!newToken) {
          throw new Error("Access token not received");
        }

        await AsyncStorage.setItem("token", newToken);

        return newToken;
      } catch (error) {
        await AsyncStorage.multiRemove([
          "token",
          "user",
          "company",
        ]);

        throw error;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
};

// =====================================
// RESPONSE INTERCEPTOR
// =====================================

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      originalRequest._retry = true;

      try {
        const newToken = await refreshAccessToken();

        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// =====================================
// LOGIN
// =====================================

export const loginUser = async (login, password) => {
  try {
    const response = await api.post("/auth/login", {
      login,
      password,
    });

    const data = response.data?.data;

    if (!data?.accessToken || !data?.user) {
      throw new Error("Invalid login response from server");
    }

    await saveAuthData(data.user, data.accessToken);

    return response.data;
  } catch (error) {
    console.log(
      "LOGIN ERROR:",
      error.response?.data || error.message
    );

    throw error;
  }
};

// =====================================
// GET CURRENT USER
// =====================================

export const getMe = async () => {
  const response = await api.get("/auth/me");

  return response.data;
};

// =====================================
// LOGOUT
// =====================================

export const logoutUser = async () => {
  try {
    await api.post("/auth/logout");
  } catch (error) {
    console.log(
      "LOGOUT API ERROR:",
      error.response?.data || error.message
    );
  } finally {
    await AsyncStorage.multiRemove([
      "token",
      "user",
      "company",
    ]);
  }
};

// =====================================
// EXPORT API INSTANCE
// =====================================

export default api;

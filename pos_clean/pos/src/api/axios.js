

import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://back.dlumebiz.com/api";
const AUTH_STORAGE_KEY = "dlumebiz_auth";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});
const refreshApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let refreshSubscribers = [];

export const setAuthToken = (accessToken) => {
  if (accessToken) {
    api.defaults.headers.common.Authorization =
      `Bearer ${accessToken}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

const subscribeTokenRefresh = (callback) => {
  refreshSubscribers.push(callback);
};

const onRefreshed = (accessToken) => {
  refreshSubscribers.forEach((callback) =>
    callback(accessToken)
  );

  refreshSubscribers = [];
};

const onRefreshFailed = (error) => {
  refreshSubscribers.forEach((callback) =>
    callback(null, error)
  );

  refreshSubscribers = [];
};

api.interceptors.request.use(async (config) => {
  // Always use the latest token.
  const storedAuth = await AsyncStorage.getItem(
    AUTH_STORAGE_KEY
  );

  if (storedAuth) {
    const parsedAuth = JSON.parse(storedAuth);

    if (parsedAuth.accessToken) {
      config.headers = config.headers || {};
      config.headers.Authorization =
        `Bearer ${parsedAuth.accessToken}`;

      setAuthToken(parsedAuth.accessToken);
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const url = originalRequest.url || "";

    // Never refresh a failed login, refresh, or logout request.
    if (
      url.includes("/auth/login") ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/logout")
    ) {
      return Promise.reject(error);
    }

    // Do not retry the same request indefinitely.
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((token, refreshError) => {
          if (refreshError || !token) {
            reject(
              refreshError ||
                new Error("Token refresh failed")
            );
            return;
          }

          originalRequest.headers =
            originalRequest.headers || {};

          originalRequest.headers.Authorization =
            `Bearer ${token}`;

          resolve(api(originalRequest));
        });
      });
    }

    isRefreshing = true;

    try {
      // This assumes your backend reads the refresh token
      // from a cookie or another server-supported session.
      const refreshResponse = await refreshApi.post(
        "/auth/refresh"
      );

      const newAccessToken =
        refreshResponse.data?.data?.accessToken;

      if (!newAccessToken) {
        throw new Error(
          "Refresh response did not contain an access token"
        );
      }

      const storedAuth = await AsyncStorage.getItem(
        AUTH_STORAGE_KEY
      );

      if (!storedAuth) {
        throw new Error("No saved authentication session");
      }

      const parsedAuth = JSON.parse(storedAuth);

      await AsyncStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          ...parsedAuth,
          accessToken: newAccessToken,
        })
      );

      setAuthToken(newAccessToken);

      onRefreshed(newAccessToken);

      originalRequest.headers =
        originalRequest.headers || {};

      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`;

      return await api(originalRequest);
    } catch (refreshError) {
      onRefreshFailed(refreshError);

      console.error(
        "❌ Access token refresh failed:",
        refreshError.response?.data ||
          refreshError.message
      );

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;

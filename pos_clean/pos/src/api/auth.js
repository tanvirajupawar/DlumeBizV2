import axios from "axios";

const API_BASE_URL = "https://back.dlumebiz.com/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const loginUser = async (login, password) => {
  const response = await api.post("/auth/login", {
    login,
    password,
  });

  return response.data;
};

export const refreshAccessToken = async () => {
  const response = await api.post("/auth/refresh");
  return response.data;
};

export const logoutUser = async () => {
  const response = await api.post("/auth/logout");
  return response.data;
};

export const getMe = async (accessToken) => {
  const response = await api.get("/auth/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data;
};
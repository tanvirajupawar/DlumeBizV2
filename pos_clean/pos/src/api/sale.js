import api from "./axios";

export const createSale = async (payload) => {
  const response = await api.post("/sales", payload);
  return response.data;
};

import api from "./axios";

export const createSale = async (payload) => {
  const response = await api.post("/sales", payload);
  return response.data;
};

export const updateSale = async (saleId, payload) => {
  const response = await api.put(`/sales/${saleId}`, payload);
  return response.data;
};

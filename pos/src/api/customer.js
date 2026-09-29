import api from "./axios";

export const fetchCustomers = async () => {
  const response = await api.get("/customers");
  return response.data?.data || [];
};

export const createCustomer = async (payload) => {
  const response = await api.post("/customers", payload);
  return response.data;
};
import api from "./axios";

export const createCustomerReturn = async (payload) => {
  const response = await api.post("/customer-returns", payload);
  return response.data;
};

export const fetchCustomerReturns = async (customerId) => {
  const response = await api.get(
    `/customer-returns?customer_id=${customerId}`
  );
  return response.data;
};
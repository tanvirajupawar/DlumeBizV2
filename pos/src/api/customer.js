import api from "./axios";

export const fetchCustomers = async () => {
  const response = await api.get("/customers");
  return response.data?.data || [];
};

export const createCustomer = async (payload) => {
  const response = await api.post("/customers", payload);
  return response.data;
};

export const fetchCustomer = async (customerId) => {
  const response = await api.get("/customers");

  const customers = response.data?.data || [];

  const customer = customers.find(
    (c) => String(c._id || c.id) === String(customerId)
  );

  return {
    data: customer || null,
  };
};

export const fetchCustomerInvoices = async (customerId) => {
  const response = await api.get(`/sales?customer_id=${customerId}`);
  return response.data;
};

export const fetchCustomerPayments = async (customerId) => {
  const response = await api.get(`/payments?customer_id=${customerId}`);
  return response.data;
};
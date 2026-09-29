import api from "./axios";

export const getCreditSummary = async (customerId, currentAmount) => {
  const response = await api.get(
    `/invoices/credit-summary/customer/${customerId}`,
    {
      params: {
        current_amount: currentAmount,
      },
    }
  );

  return response.data;
};
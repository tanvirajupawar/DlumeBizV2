import api from "./axios";

export const getCreditSummary = async (
  customerId,
  currentAmount,
  editInvoiceId = null
) => {
  const response = await api.get(
    `/invoices/credit-summary/customer/${customerId}`,
    {
      params: {
        current_amount: currentAmount,
        ...(editInvoiceId ? { edit_invoice_id: editInvoiceId } : {}),
      },
    }
  );

  return response.data;
};

import api from "./AuthApi";

const formatDate = (value) => {
  if (!value) return "";

  // Preserve date-only values without timezone shifting.
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()}`;
};

export const fetchCollections = async () => {
  try {
    const res = await api.get("/payments");

    const payments = res.data?.data || [];

    const collections = payments.map((payment) => {
      const customer = payment.customer_id || {};

      return {
        id: payment._id,

        customerName:
          customer.company_name?.trim() ||
          `${customer.first_name || ""} ${
            customer.last_name || ""
          }`.trim() ||
          customer.name ||
          "Walk-in Customer",

        customer_id: customer._id || "",

        amount: Number(payment.amount || 0),

        date: formatDate(payment.payment_date),
        payment_date: payment.payment_date || "",

        payment_method: payment.payment_method || "",

        reference_no: payment.reference_no || "",
        remarks: payment.remarks || "",

        invoice_no: payment.invoice_no || "-",

        allocations: Array.isArray(payment.allocations)
          ? payment.allocations
          : [],
      };
    });

    const totalCollections = collections.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

    return {
      collections,
      totalCollections,
    };
  } catch (error) {
    console.log(
      "Fetch collections error:",
      error.response?.data || error.message
    );
    throw error;
  }
};

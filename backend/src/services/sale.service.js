import SaleCounter from "../models/sale_counter.model.js";

export const getNextInvoiceNumber = async (companyId) => {
  const counter = await SaleCounter.findOneAndUpdate(
    {
      company_id: companyId,
    },
    {
      $inc: {
        next_number: 1,
      },
    },
    {
      new: false,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  const number = counter ? counter.next_number : 1;

  return `I-${String(number).padStart(5, "0")}`;
};
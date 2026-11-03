import Customer from "../models/customer.model.js";
import Sale from "../models/sale.model.js";
import Payment from "../models/payment.model.js";
import PaymentAllocation from "../models/payment_allocation.model.js";
import CustomerReturn from "../models/customer_return.model.js";
import CustomerReturnAllocation from "../models/customer_return_allocation.model.js";
import CustomerLedger from "../models/customer_ledger.model.js";

export const getCustomerLedger = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { id } = req.params;

    // --------------------------------
    // 1. FIND CUSTOMER
    // --------------------------------

    const customer = await Customer.findOne({
      _id: id,
      company_id: companyId,
      is_active: true,
    }).lean();

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // --------------------------------
    // 2. GET CUSTOMER SALES
    // --------------------------------

    const sales = await Sale.find({
      company_id: companyId,
      customer_id: customer._id,
    })
      .sort({ invoice_date: 1 })
      .lean();

    // --------------------------------
    // 3. GET PAYMENT ALLOCATIONS
    // --------------------------------

const customerSaleIds = sales.map((sale) => sale._id);

const allocations = customerSaleIds.length
  ? await PaymentAllocation.find({
      company_id: companyId,
      sale_id: { $in: customerSaleIds },
    }).lean()
  : [];

    // --------------------------------
    // 4. GET CUSTOMER PAYMENTS
    // --------------------------------

    const payments = await Payment.find({
      company_id: companyId,
      customer_id: customer._id,
    })
      .sort({ payment_date: 1 })
      .lean();


      // --------------------------------
// GET CUSTOMER REFUNDS
// --------------------------------

const refunds = await CustomerLedger.find({
  company_id: companyId,
  customer_id: customer._id,
  type: "REFUND",
})
  .sort({ transaction_date: 1 })
  .lean();


// --------------------------------
// 4A. GET CUSTOMER RETURNS
// --------------------------------

const customerReturns = await CustomerReturn.find({
  company_id: companyId,
  customer_id: customer._id,
})
  .sort({ return_date: 1 })
  .lean();



  // --------------------------------
// 4B. GET CUSTOMER RETURN ALLOCATIONS
// --------------------------------

const returnAllocations = customerSaleIds.length
  ? await CustomerReturnAllocation.find({
      company_id: companyId,
      sale_id: { $in: customerSaleIds },
    }).lean()
  : [];

// --------------------------------
// 5. BUILD SALE PAYMENT AND RETURN MAPS
// --------------------------------

const salePaidMap = {};
const saleReturnedMap = {};

for (const allocation of allocations) {
  const saleId = allocation.sale_id.toString();

  salePaidMap[saleId] =
    (salePaidMap[saleId] || 0) +
    Number(allocation.amount || 0);
}

for (const allocation of returnAllocations) {
  const saleId = allocation.sale_id.toString();

  saleReturnedMap[saleId] =
    (saleReturnedMap[saleId] || 0) +
    Number(allocation.amount || 0);
}

    // --------------------------------
    // 6. BUILD TRANSACTIONS
    // --------------------------------

    const transactions = [];

    for (const sale of sales) {
const saleId = sale._id.toString();

const paidAmount = Number(salePaidMap[saleId] || 0);
const returnedAmount = Number(saleReturnedMap[saleId] || 0);

const balanceAmount = Number(
  Math.max(
    0,
    Number(sale.total_amount || 0) -
      paidAmount -
      returnedAmount
  ).toFixed(2)
);

const creditedAmount = paidAmount + returnedAmount;

let status = "UNPAID";

if (balanceAmount === 0) {
  status = "PAID";
} else if (creditedAmount > 0) {
  status = "PARTIAL";
}

      transactions.push({
        type: "SALE",
        date: sale.invoice_date,
          createdAt: sale.createdAt,
        reference: sale.invoice_no,
        sale_id: sale._id,
      amount: Number(sale.total_amount || 0),
paid_amount: paidAmount,
returned_amount: returnedAmount,
balance_amount: balanceAmount,
status,
      });
    }

    // --------------------------------
    // 7. ADD PAYMENT TRANSACTIONS
    // --------------------------------

    for (const payment of payments) {
      transactions.push({
        type: "PAYMENT",
        date: payment.payment_date,
        createdAt: payment.createdAt,
        reference: payment._id,
        payment_id: payment._id,
        amount: payment.amount,
        payment_method: payment.payment_method,
        reference_no: payment.reference_no,
        remarks: payment.remarks,
      });
    }

    // --------------------------------
// 7A. ADD RETURN TRANSACTIONS
// --------------------------------

for (const customerReturn of customerReturns) {
  transactions.push({
    type: "RETURN",
    date: customerReturn.return_date,
    createdAt: customerReturn.createdAt,
    reference: customerReturn.return_no,
    return_id: customerReturn._id,
    amount: Number(customerReturn.total_amount || 0),
    credit: Number(customerReturn.total_amount || 0),
    description: customerReturn.description || "",
  });
}


// --------------------------------
// 7B. ADD REFUND TRANSACTIONS
// --------------------------------

for (const refund of refunds) {
  const originalPayment = payments.find(
    (payment) =>
      String(payment._id) === String(refund.payment_id)
  );

  const originalSale = sales.find(
    (sale) =>
      String(sale._id) === String(refund.source_sale_id)
  );

  transactions.push({
    type: "REFUND",
    date: refund.transaction_date,
    createdAt: refund.createdAt,
    reference: originalSale?.invoice_no || refund._id,
    refund_id: refund._id,
    payment_id: refund.payment_id,
    sale_id: refund.source_sale_id,

    amount: Number(refund.debit || 0),

    refund_method: originalPayment?.payment_method || "",
    invoice_no: originalSale?.invoice_no || "",

    description:
      refund.description || "Excess payment refunded",
  });
}

    // --------------------------------
    // 8. SORT ALL TRANSACTIONS
    // --------------------------------

 // Newest transaction first, mixing all transaction types
transactions.sort((a, b) => {
  const dateA = new Date(a.date || 0).getTime();
  const dateB = new Date(b.date || 0).getTime();

  if (dateA !== dateB) {
    return dateB - dateA;
  }

  // Same transaction date: use record creation time
  const createdA = new Date(a.createdAt || 0).getTime();
  const createdB = new Date(b.createdAt || 0).getTime();

  return createdB - createdA;
});

    // --------------------------------
    // 9. CALCULATE SUMMARY
    // --------------------------------

    const openingBalance = Number(customer.opening_balance || 0);

    const totalSales = sales.reduce(
      (total, sale) => total + Number(sale.total_amount || 0),
      0
    );

    const totalPayments = payments.reduce(
      (total, payment) => total + Number(payment.amount || 0),
      0
    );

const totalReturns = customerReturns.reduce(
  (total, customerReturn) =>
    total + Number(customerReturn.total_amount || 0),
  0
);

const totalRefunds = refunds.reduce(
  (total, refund) => total + Number(refund.debit || 0),
  0
);

const netOutstanding = Number(
  (
    openingBalance +
    totalSales -
    totalPayments -
    totalReturns +
    totalRefunds
  ).toFixed(2)
);

const outstanding = Math.max(0, netOutstanding);

const customerCredit = Math.max(0, -netOutstanding);

    // --------------------------------
    // 10. RESPONSE
    // --------------------------------

    return res.status(200).json({
      success: true,
      message: "Customer ledger fetched successfully",

      data: {
        customer: {
          _id: customer._id,
          first_name: customer.first_name,
          last_name: customer.last_name,
          customer_name: customer.customer_name,
        },

       summary: {
  opening_balance: openingBalance,
  total_sales: totalSales,
  total_payments: totalPayments,
  total_returns: totalReturns,
  total_refunds: totalRefunds,
  outstanding,
  customer_credit: customerCredit,
},

        transactions,
      },
    });
  } catch (error) {
    console.error("Get customer ledger error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer ledger",
      error: error.message,
    });
  }
};
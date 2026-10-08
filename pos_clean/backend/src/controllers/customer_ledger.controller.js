import Customer from "../models/customer.model.js";
import Sale from "../models/sale.model.js";
import Payment from "../models/payment.model.js";
import PaymentAllocation from "../models/payment_allocation.model.js";

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

    const allocations = await PaymentAllocation.find({
      company_id: companyId,
    }).lean();

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
    // 5. BUILD SALE PAYMENT MAP
    // --------------------------------

    const salePaidMap = {};

    for (const allocation of allocations) {
      const saleId = allocation.sale_id.toString();

      if (!salePaidMap[saleId]) {
        salePaidMap[saleId] = 0;
      }

      salePaidMap[saleId] += Number(allocation.amount || 0);
    }

    // --------------------------------
    // 6. BUILD TRANSACTIONS
    // --------------------------------

    const transactions = [];

    for (const sale of sales) {
      const paidAmount = salePaidMap[sale._id.toString()] || 0;
      const balanceAmount = sale.total_amount - paidAmount;

      let status = "UNPAID";

      if (balanceAmount === 0) {
        status = "PAID";
      } else if (paidAmount > 0) {
        status = "PARTIAL";
      }

      transactions.push({
        type: "SALE",
        date: sale.invoice_date,
        reference: sale.invoice_no,
        sale_id: sale._id,
        amount: sale.total_amount,
        paid_amount: paidAmount,
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
        reference: payment._id,
        payment_id: payment._id,
        amount: payment.amount,
        payment_method: payment.payment_method,
        reference_no: payment.reference_no,
        remarks: payment.remarks,
      });
    }

    // --------------------------------
    // 8. SORT ALL TRANSACTIONS
    // --------------------------------

    transactions.sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

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

    const outstanding =
      openingBalance + totalSales - totalPayments;

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
          outstanding,
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
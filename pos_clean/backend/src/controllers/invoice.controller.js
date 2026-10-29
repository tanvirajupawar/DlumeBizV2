import Sale from "../models/sale.model.js";
import SaleItem from "../models/sale_item.model.js";
import PaymentAllocation from "../models/payment_allocation.model.js";
import Customer from "../models/customer.model.js";
import CustomerLedger from "../models/customer_ledger.model.js";

export const getInvoiceById = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { id } = req.params;

    // --------------------------------
    // 1. FIND SALE
    // --------------------------------

    const sale = await Sale.findOne({
      _id: id,
      company_id: companyId,
    }).lean();

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    // --------------------------------
    // 2. GET SALE ITEMS
    // --------------------------------

    const items = await SaleItem.find({
      sale_id: sale._id,
      company_id: companyId,
    }).lean();

    // --------------------------------
    // 3. GET PAYMENT ALLOCATIONS
    // --------------------------------

    const allocations = await PaymentAllocation.find({
      sale_id: sale._id,
      company_id: companyId,
    }).lean();

    // --------------------------------
    // 4. CALCULATE PAID AMOUNT
    // --------------------------------

    const paidAmount = allocations.reduce(
      (total, allocation) => total + Number(allocation.amount || 0),
      0
    );

    const balanceAmount = sale.total_amount - paidAmount;

    // --------------------------------
    // 5. DETERMINE STATUS
    // --------------------------------

    let status = "UNPAID";

    if (balanceAmount === 0) {
      status = "PAID";
    } else if (paidAmount > 0) {
      status = "PARTIAL";
    }

    // --------------------------------
    // 6. RESPONSE
    // --------------------------------

    return res.status(200).json({
      success: true,
      message: "Invoice fetched successfully",

      data: {
        sale: {
          ...sale,
          paid_amount: paidAmount,
          balance_amount: balanceAmount,
          status,
        },

        items,

        payment_summary: {
          total_amount: sale.total_amount,
          paid_amount: paidAmount,
          balance_amount: balanceAmount,
          status,
        },
      },
    });
  } catch (error) {
    console.error("Get invoice error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch invoice",
      error: error.message,
    });
  }
};


export const getInvoices = async (req, res) => {
  try {
    const companyId = req.user.company_id;

    const sales = await Sale.find({
      company_id: companyId,
    })
      .sort({ invoice_date: -1 })
      .lean();

    const saleIds = sales.map((sale) => sale._id);

    const allocations = await PaymentAllocation.find({
      company_id: companyId,
      sale_id: { $in: saleIds },
    }).lean();

    const paidMap = {};

    for (const allocation of allocations) {
      const saleId = allocation.sale_id.toString();

      if (!paidMap[saleId]) {
        paidMap[saleId] = 0;
      }

      paidMap[saleId] += Number(allocation.amount || 0);
    }

    const invoices = sales.map((sale) => {
      const paidAmount = paidMap[sale._id.toString()] || 0;
      const balanceAmount = sale.total_amount - paidAmount;

      let status = "UNPAID";

      if (balanceAmount === 0) {
        status = "PAID";
      } else if (paidAmount > 0) {
        status = "PARTIAL";
      }

      return {
        _id: sale._id,
        invoice_no: sale.invoice_no,
        invoice_date: sale.invoice_date,
        customer_id: sale.customer_id,
        source: sale.source,
        sale_mode: sale.sale_mode,
        subtotal: sale.subtotal,
        discount_amount: sale.discount_amount,
        total_amount: sale.total_amount,
        paid_amount: paidAmount,
        balance_amount: balanceAmount,
        status,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Invoices fetched successfully",
      data: invoices,
    });
  } catch (error) {
    console.error("Get invoices error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch invoices",
      error: error.message,
    });
  }
};


export const getCustomerInvoices = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { customerId } = req.params;

    const customer = await Customer.findOne({
      _id: customerId,
      company_id: companyId,
      is_active: true,
    }).lean();

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const sales = await Sale.find({
      company_id: companyId,
      customer_id: customer._id,
    })
      .sort({ invoice_date: -1 })
      .lean();

    const saleIds = sales.map((sale) => sale._id);

    const allocations = await PaymentAllocation.find({
      company_id: companyId,
      sale_id: { $in: saleIds },
    }).lean();

    const paidMap = {};

    for (const allocation of allocations) {
      const saleId = allocation.sale_id.toString();

      if (!paidMap[saleId]) {
        paidMap[saleId] = 0;
      }

      paidMap[saleId] += Number(allocation.amount || 0);
    }

    const invoices = sales.map((sale) => {
      const paidAmount = paidMap[sale._id.toString()] || 0;
      const balanceAmount = sale.total_amount - paidAmount;

      let status = "UNPAID";

      if (balanceAmount === 0) {
        status = "PAID";
      } else if (paidAmount > 0) {
        status = "PARTIAL";
      }

      return {
        _id: sale._id,
        invoice_no: sale.invoice_no,
        invoice_date: sale.invoice_date,
        sale_mode: sale.sale_mode,
        source: sale.source,
        subtotal: sale.subtotal,
        discount_amount: sale.discount_amount,
        total_amount: sale.total_amount,
        paid_amount: paidAmount,
        balance_amount: balanceAmount,
        status,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Customer invoices fetched successfully",
      data: invoices,
    });
  } catch (error) {
    console.error("Get customer invoices error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer invoices",
      error: error.message,
    });
  }
};



export const getCreditSummary = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { customerId } = req.params;

    const currentInvoiceAmount = Number(
      req.query.current_amount || 0
    );

    // 1. Validate current invoice amount
    if (
      !Number.isFinite(currentInvoiceAmount) ||
      currentInvoiceAmount < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid current invoice amount",
      });
    }

    // 2. Find customer belonging to this company
    const customer = await Customer.findOne({
      _id: customerId,
      company_id: companyId,
      is_active: true,
    }).lean();

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // 3. Calculate remaining opening balance
    const openingBalance = Number(
      customer.opening_balance || 0
    );

    // Only count payments specifically allocated to opening balance.
    // Do not count invoice payments here.
    const openingBalancePayments = await CustomerLedger.find({
      company_id: companyId,
      customer_id: customer._id,
      type: "PAYMENT",
      sale_id: null,
      description: "Payment against opening balance",
    }).lean();

    const openingBalancePaid = openingBalancePayments.reduce(
      (total, entry) =>
        total + Number(entry.credit || 0),
      0
    );

    const remainingOpeningBalance = Math.max(
      0,
      openingBalance - openingBalancePaid
    );

    // 4. Get all existing invoices for this customer
    const sales = await Sale.find({
      company_id: companyId,
      customer_id: customer._id,
    })
      .select("_id total_amount")
      .lean();

    const saleIds = sales.map((sale) => sale._id);

    // 5. Get payments allocated to those invoices
    const allocations = saleIds.length
      ? await PaymentAllocation.find({
          company_id: companyId,
          sale_id: { $in: saleIds },
        })
          .select("sale_id amount")
          .lean()
      : [];

    // 6. Total payments per invoice
    const paidMap = new Map();

    for (const allocation of allocations) {
      const saleId = allocation.sale_id.toString();

      paidMap.set(
        saleId,
        (paidMap.get(saleId) || 0) +
          Number(allocation.amount || 0)
      );
    }

    // 7. Calculate outstanding across existing invoices
    const invoiceOutstanding = sales.reduce((total, sale) => {
      const paidAmount =
        paidMap.get(sale._id.toString()) || 0;

      const balance = Math.max(
        0,
        Number(sale.total_amount || 0) - paidAmount
      );

      return total + balance;
    }, 0);

    // 8. Previous outstanding = opening balance + invoice balances
    const previousOutstanding =
      Math.round(
        (remainingOpeningBalance + invoiceOutstanding) * 100
      ) / 100;

    // 9. Include the invoice currently being created
    const totalPayable =
      Math.round(
        (previousOutstanding + currentInvoiceAmount) * 100
      ) / 100;

    return res.status(200).json({
      success: true,
      message: "Credit summary fetched successfully",
      data: {
        previous_outstanding: previousOutstanding,
        current_invoice_amount: currentInvoiceAmount,
        total_payable: totalPayable,
      },
    });
  } catch (error) {
    console.error("Get credit summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch credit summary",
      error: error.message,
    });
  }
};

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

    // --------------------------------
    // 1. FIND CUSTOMER
    // --------------------------------

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

    // --------------------------------
    // 2. ORIGINAL OPENING BALANCE
    // --------------------------------

    const openingBalance = Number(
      customer.opening_balance || 0
    );

    // --------------------------------
    // 3. GET CUSTOMER LEDGER
    // --------------------------------

    const ledgerEntries = await CustomerLedger.find({
      company_id: companyId,
      customer_id: customer._id,
    })
      .sort({ transaction_date: 1, createdAt: 1 })
      .lean();

    // --------------------------------
    // 4. CALCULATE LEDGER BALANCE
    // --------------------------------

    const ledgerDebit = ledgerEntries.reduce(
      (total, entry) =>
        total + Number(entry.debit || 0),
      0
    );

    const ledgerCredit = ledgerEntries.reduce(
      (total, entry) =>
        total + Number(entry.credit || 0),
      0
    );

    // --------------------------------
    // 5. PREVIOUS OUTSTANDING
    // --------------------------------

    const previousOutstanding = Math.max(
      0,
      openingBalance +
        ledgerDebit -
        ledgerCredit
    );

    // --------------------------------
    // 6. CURRENT INVOICE + OUTSTANDING
    // --------------------------------

    const totalPayable =
      previousOutstanding +
      currentInvoiceAmount;

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
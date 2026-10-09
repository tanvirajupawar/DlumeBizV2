import Customer from "../models/customer.model.js";
import Sale from "../models/sale.model.js";
import PaymentAllocation from "../models/payment_allocation.model.js";
import CustomerLedger from "../models/customer_ledger.model.js";
import CustomerReturn from "../models/customer_return.model.js";

export const createCustomer = async (req, res) => {
  try {
    const companyId = req.user.company_id;

    const {
      first_name,
      last_name,
      company_name,
      customer_type,
      business_type,
      gstin,
      pan_number,
      email,
      website,
      contact_no_1,
      contact_no_2,
      address_line_1,
      address_line_2,
      city,
      state,
      country,
      pincode,
      opening_balance,
    } = req.body;

    // ============================================
    // 1. BASIC VALIDATION
    // ============================================

    if (!first_name || !String(first_name).trim()) {
      return res.status(400).json({
        success: false,
        message: "First name is required",
      });
    }

    // ============================================
    // 2. NORMALIZE DATA
    // ============================================

    const normalizedFirstName = String(first_name).trim();
    const normalizedLastName = String(last_name || "").trim();

    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();

    const normalizedGstin = String(gstin || "")
      .trim()
      .toUpperCase();

    const normalizedPan = String(pan_number || "")
      .trim()
      .toUpperCase();

    const normalizedContact1 = String(contact_no_1 || "").trim();
    const normalizedContact2 = String(contact_no_2 || "").trim();

    const openingBalance = Number(opening_balance || 0);

    // ============================================
    // 3. OPENING BALANCE VALIDATION
    // ============================================

    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid opening balance",
      });
    }

    // ============================================
    // 4. DUPLICATE CONTACT CHECK
    // ============================================

    if (normalizedContact1) {
      const existingCustomer = await Customer.findOne({
        company_id: companyId,
        contact_no_1: normalizedContact1,
      });

      if (existingCustomer) {
        return res.status(409).json({
          success: false,
          message: "Customer with this contact number already exists",
        });
      }
    }

    // ============================================
    // 5. CREATE CUSTOMER
    // ============================================

    const customer = await Customer.create({
      company_id: companyId,

      first_name: normalizedFirstName,
      last_name: normalizedLastName,

      company_name: String(company_name || "").trim(),
      customer_type: String(customer_type || "").trim(),
      business_type: String(business_type || "").trim(),

      gstin: normalizedGstin,
      pan_number: normalizedPan,

      email: normalizedEmail,
      website: String(website || "").trim(),

      contact_no_1: normalizedContact1,
      contact_no_2: normalizedContact2,

      address_line_1: String(address_line_1 || "").trim(),
      address_line_2: String(address_line_2 || "").trim(),

      city: String(city || "").trim(),
      state: String(state || "").trim(),
      country: String(country || "India").trim(),
      pincode: String(pincode || "").trim(),

      opening_balance: openingBalance,
    });

    // ============================================
    // 6. RESPONSE
    // ============================================

    return res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: customer,
    });
  } catch (error) {
    console.error("Create customer error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create customer",
      error: error.message,
    });
  }
};

export const getCustomers = async (req, res) => {
  try {
    const companyId = req.user.company_id;

    const customers = await Customer.find({
      company_id: companyId,
      is_active: true,
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!customers.length) {
      return res.status(200).json({
        success: true,
        message: "Customers fetched successfully",
        data: [],
      });
    }

    const customerIds = customers.map((customer) => customer._id);

    // ============================================
    // 1. GET ALL CUSTOMER SALES
    // ============================================

    const sales = await Sale.find({
      company_id: companyId,
      customer_id: { $in: customerIds },
    }).lean();

    // ============================================
    // 2. GET ALL PAYMENT ALLOCATIONS
    // ============================================

    const saleIds = sales.map((sale) => sale._id);

    const allocations = saleIds.length
      ? await PaymentAllocation.find({
          company_id: companyId,
          sale_id: { $in: saleIds },
        }).lean()
      : [];

    // ============================================
    // 3. CALCULATE PAYMENT BY SALE
    // ============================================

    const paidBySale = new Map();

    for (const allocation of allocations) {
      const saleId = allocation.sale_id.toString();

      const current = paidBySale.get(saleId) || 0;

      paidBySale.set(
        saleId,
        current + Number(allocation.amount || 0)
      );
    }

    // ============================================
    // 4. CALCULATE SALES BY CUSTOMER
    // ============================================

    const salesByCustomer = new Map();

    for (const sale of sales) {
      const customerId = sale.customer_id.toString();

      const current = salesByCustomer.get(customerId) || 0;

      salesByCustomer.set(
        customerId,
        current + Number(sale.total_amount || 0)
      );
    }

    // ============================================
    // 5. CALCULATE INVOICE PAYMENTS BY CUSTOMER
    // ============================================

    const invoicePaymentsByCustomer = new Map();

    for (const sale of sales) {
      const customerId = sale.customer_id.toString();
      const saleId = sale._id.toString();

      const paid = paidBySale.get(saleId) || 0;

      const current =
        invoicePaymentsByCustomer.get(customerId) || 0;

      invoicePaymentsByCustomer.set(
        customerId,
        current + paid
      );
    }

    // ============================================
    // 6. GET OPENING BALANCE PAYMENTS
    // ============================================

    const openingBalanceLedgers = await CustomerLedger.find({
      company_id: companyId,
      customer_id: { $in: customerIds },
      type: "PAYMENT",
      sale_id: null,
    }).lean();


    


// Get all previous customer returns.
const customerReturns = await CustomerReturn.find({
  company_id: companyId,
  customer_id: { $in: customerIds },
})
  .select("customer_id total_amount")
  .lean();

// Calculate total returns for each customer.
const returnsByCustomer = new Map();

for (const customerReturn of customerReturns) {
  const customerId = customerReturn.customer_id.toString();

  const current = returnsByCustomer.get(customerId) || 0;

  returnsByCustomer.set(
    customerId,
    current + Number(customerReturn.total_amount || 0)
  );
}


    const openingBalancePaymentsByCustomer = new Map();

    for (const ledger of openingBalanceLedgers) {
      const customerId = ledger.customer_id.toString();

      const current =
        openingBalancePaymentsByCustomer.get(customerId) || 0;

      openingBalancePaymentsByCustomer.set(
        customerId,
        current + Number(ledger.credit || 0)
      );
    }

// ============================================
// 7. BUILD CUSTOMER RESPONSE
// ============================================

const customersWithOutstanding = customers.map((customer) => {
  const customerId = customer._id.toString();

  const openingBalance = Number(
    customer.opening_balance || 0
  );

  const totalSales =
    Number(salesByCustomer.get(customerId) || 0);

  const invoicePayments =
    Number(invoicePaymentsByCustomer.get(customerId) || 0);

  const openingBalancePayments =
    Number(
      openingBalancePaymentsByCustomer.get(customerId) || 0
    );

    const totalReturns = Number(
  (returnsByCustomer.get(customerId) || 0).toFixed(2)
);

  // Remaining opening balance
  const remainingOpeningBalance = Math.max(
    openingBalance - openingBalancePayments,
    0
  );

  // Remaining invoice balance
  const remainingInvoiceBalance = Math.max(
    totalSales - invoicePayments,
    0
  );

  // FINAL CUSTOMER OUTSTANDING
const outstanding = Number(
  Math.max(
    0,
    remainingOpeningBalance +
      remainingInvoiceBalance -
      totalReturns
  ).toFixed(2)
);

  return {
    ...customer,

    // Main outstanding field used by frontend
    outstanding,

    // Keep these for other screens/reports if needed
    total_sales: Number(totalSales.toFixed(2)),
    invoice_payments: Number(invoicePayments.toFixed(2)),
    opening_balance_paid: Number(
      openingBalancePayments.toFixed(2)
    ),
    remaining_opening_balance: Number(
      remainingOpeningBalance.toFixed(2)
    ),
    remaining_invoice_balance: Number(
      remainingInvoiceBalance.toFixed(2)
    ),

    // Compatibility field
    pending_amount: outstanding,
  };
});

    // ============================================
    // 8. RESPONSE
    // ============================================

    return res.status(200).json({
      success: true,
      message: "Customers fetched successfully",
      data: customersWithOutstanding,
    });
  } catch (error) {
    console.error("Get customers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
      error: error.message,
    });
  }
};

export const getCustomerById = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const customerId = req.params.id;

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

    // =========================
    // GET CUSTOMER SALES
    // =========================

    const sales = await Sale.find({
      company_id: companyId,
      customer_id: customerId,
    }).lean();

    const saleIds = sales.map((sale) => sale._id);

    // =========================
    // GET PAYMENT ALLOCATIONS
    // =========================

    const allocations = saleIds.length
      ? await PaymentAllocation.find({
          company_id: companyId,
          sale_id: { $in: saleIds },
        }).lean()
      : [];

    const paidBySale = new Map();

    for (const allocation of allocations) {
      const saleId = allocation.sale_id.toString();

      const current = paidBySale.get(saleId) || 0;

      paidBySale.set(
        saleId,
        current + Number(allocation.amount || 0)
      );
    }

    // =========================
    // CALCULATE SALES
    // =========================

    let totalSales = 0;
    let invoicePayments = 0;

    for (const sale of sales) {
      const saleAmount = Number(sale.total_amount || 0);

      totalSales += saleAmount;

      const paid = Number(
        paidBySale.get(sale._id.toString()) || 0
      );

      invoicePayments += paid;
    }

    // =========================
    // OPENING BALANCE PAYMENTS
    // =========================

    const openingBalanceLedgers = await CustomerLedger.find({
      company_id: companyId,
      customer_id: customerId,
      type: "PAYMENT",
      sale_id: null,
    }).lean();


// Get previous returns for this customer.
const customerReturns = await CustomerReturn.find({
  company_id: companyId,
  customer_id: customerId,
})
  .select("total_amount")
  .lean();

const totalReturns = customerReturns.reduce(
  (sum, item) => sum + Number(item.total_amount || 0),
  0
);


    let openingBalancePayments = 0;

    for (const ledger of openingBalanceLedgers) {
      openingBalancePayments += Number(ledger.credit || 0);
    }

    // =========================
    // OUTSTANDING CALCULATION
    // =========================

    const openingBalance = Number(
      customer.opening_balance || 0
    );

    const remainingOpeningBalance = Math.max(
      openingBalance - openingBalancePayments,
      0
    );

    const remainingInvoiceBalance = Math.max(
      totalSales - invoicePayments,
      0
    );

const outstanding = Number(
  Math.max(
    0,
    remainingOpeningBalance +
      remainingInvoiceBalance -
      totalReturns
  ).toFixed(2)
);
    // =========================
    // RESPONSE
    // =========================

    return res.status(200).json({
      success: true,
      message: "Customer fetched successfully",

      data: {
        ...customer,

        outstanding,

        total_sales: Number(totalSales.toFixed(2)),

        invoice_payments: Number(
          invoicePayments.toFixed(2)
        ),

        opening_balance_paid: Number(
          openingBalancePayments.toFixed(2)
        ),

        remaining_opening_balance: Number(
          remainingOpeningBalance.toFixed(2)
        ),

        remaining_invoice_balance: Number(
          remainingInvoiceBalance.toFixed(2)
        ),

        pending_amount: outstanding,
      },
    });
  } catch (error) {
    console.error("Get customer by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer",
      error: error.message,
    });
  }
};
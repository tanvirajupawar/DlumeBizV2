import Payment from "../models/payment.model.js";
import PaymentAllocation from "../models/payment_allocation.model.js";
import Sale from "../models/sale.model.js";
import Company from "../models/company.model.js";
import Customer from "../models/customer.model.js";
import CustomerLedger from "../models/customer_ledger.model.js";
import mongoose from "mongoose";

export const createPayment = async (req, res) => {
  try {
   const session = await mongoose.startSession();
let transactionStarted = false;
    const companyId = req.user.company_id;
    const userId = req.user._id;

  const {
  sale_id,
  customer_id,
  amount,
  payment_method,
  reference_no = "",
  remarks = "",
} = req.body;

    // --------------------------------
    // 1. BASIC VALIDATION
    // --------------------------------
if (!sale_id && !customer_id) {
  return res.status(400).json({
    success: false,
    message: "sale_id or customer_id is required",
  });
}

    const paymentAmount = Number(amount);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be greater than 0",
      });
    }

  if (!["CASH", "CARD", "UPI", "OTHER"].includes(payment_method)) {
  return res.status(400).json({
    success: false,
    message: "Invalid payment method",
  });
}
session.startTransaction();
transactionStarted = true;


    // --------------------------------
    // 2. GET COMPANY
    // --------------------------------

const company = await Company.findById(companyId).session(session);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }


    // --------------------------------
// OPENING BALANCE ONLY PAYMENT
// --------------------------------

if (!sale_id && customer_id) {
  const customer = await Customer.findOne({
    _id: customer_id,
    company_id: companyId,
    is_active: true,
  }).session(session);

  if (!customer) {
    return res.status(404).json({
      success: false,
      message: "Customer not found",
    });
  }

  // Original opening balance
  const originalOpeningBalance = Number(
    customer.opening_balance || 0
  );

  // Payments already made against opening balance
  const openingBalancePayments = await CustomerLedger.find({
    company_id: companyId,
    customer_id: customer._id,
    type: "PAYMENT",
    sale_id: null,
    description: "Payment against opening balance",
  })
    .session(session)
    .lean();

  const openingBalancePaid =
    openingBalancePayments.reduce(
      (total, entry) =>
        total + Number(entry.credit || 0),
      0
    );

  const remainingOpeningBalance = Math.max(
    0,
    originalOpeningBalance - openingBalancePaid
  );

  // Cannot pay more than opening balance
  if (paymentAmount > remainingOpeningBalance) {
    return res.status(400).json({
      success: false,
      message: `Payment cannot exceed opening balance outstanding of ${remainingOpeningBalance.toFixed(
        2
      )}`,
    });
  }

  // Update customer account version
  const customerVersion =
    customer.account_version || 0;

  const customerVersionUpdate =
    await Customer.updateOne(
      {
        _id: customer._id,
        company_id: companyId,
        account_version: customerVersion,
      },
      {
        $inc: {
          account_version: 1,
        },
      },
      {
        session,
      }
    );

  if (customerVersionUpdate.modifiedCount !== 1) {
    throw new Error(
      "Customer account was updated by another payment. Please try again."
    );
  }

  // --------------------------------
  // CREATE PAYMENT
  // --------------------------------

  const [payment] = await Payment.create(
    [
      {
        company_id: companyId,
        customer_id: customer._id,
        amount: paymentAmount,
        payment_method,
        reference_no: String(reference_no || "").trim(),
        remarks: String(remarks || "").trim(),
        received_by: userId,
      },
    ],
    { session }
  );

  // --------------------------------
  // CREATE OPENING BALANCE LEDGER
  // --------------------------------

  await CustomerLedger.create(
    [
      {
        company_id: companyId,
        customer_id: customer._id,
        type: "PAYMENT",
        sale_id: null,
        payment_id: payment._id,
        debit: 0,
        credit: paymentAmount,
        description: "Payment against opening balance",
        transaction_date: payment.payment_date,
      },
    ],
    { session }
  );

  const newOpeningBalance =
    Math.max(
      0,
      remainingOpeningBalance - paymentAmount
    );

  await session.commitTransaction();
  await session.endSession();

  return res.status(201).json({
    success: true,
    message: "Opening balance payment recorded successfully",

    data: {
      payment_id: payment._id,
      customer_id: customer._id,

      payment_amount: paymentAmount,

      opening_balance_paid: paymentAmount,

      remaining_opening_balance: newOpeningBalance,

      status:
        newOpeningBalance === 0
          ? "PAID"
          : "PARTIAL",
    },
  });
}

    // --------------------------------
    // 3. FIND CURRENT SALE
    // --------------------------------

const sale = await Sale.findOne({
  _id: sale_id,
  company_id: companyId,
}).session(session);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Sale not found",
      });
    }

    // --------------------------------
    // 4. NON-CREDIT / WALK-IN RULES
    // --------------------------------

    if (company.payment_mode === "NON_CREDIT") {
      if (paymentAmount < Number(sale.total_amount || 0)) {
        return res.status(400).json({
          success: false,
          message: "Full payment is required for NON_CREDIT mode",
        });
      }
    }

    if (company.payment_mode === "CREDIT" && !sale.customer_id) {
      if (paymentAmount < Number(sale.total_amount || 0)) {
        return res.status(400).json({
          success: false,
          message: "Walk-in sale must be paid in full",
        });
      }
    }

    // --------------------------------
    // 5. CURRENT SALE BALANCE
    // --------------------------------

const currentAllocations = await PaymentAllocation.find({
  company_id: companyId,
  sale_id: sale._id,
}).session(session).lean();

    const currentAlreadyPaid = currentAllocations.reduce(
      (total, allocation) =>
        total + Number(allocation.amount || 0),
      0
    );

    const currentRemaining = Math.max(
      0,
      Number(sale.total_amount || 0) - currentAlreadyPaid
    );

    // --------------------------------
    // 6. CREDIT CUSTOMER
    // --------------------------------

    let customer = null;

    if (sale.customer_id) {
customer = await Customer.findOne({
  _id: sale.customer_id,
  company_id: companyId,
  is_active: true,
}).session(session);

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }
    }
const customerVersion = customer.account_version || 0;

const customerVersionUpdate = await Customer.updateOne(
  {
    _id: customer._id,
    company_id: companyId,
    account_version: customerVersion,
  },
  {
    $inc: { account_version: 1 },
  },
  { session }
);

if (customerVersionUpdate.modifiedCount !== 1) {
  throw new Error(
    "Customer account was updated by another payment. Please try again."
  );
}

    // --------------------------------
    // 7. BUILD PAYMENT ALLOCATION PLAN
    // --------------------------------

    let remainingPayment = paymentAmount;

    const allocationPlan = [];

    // --------------------------------
    // 7A. CURRENT INVOICE FIRST
    // --------------------------------

    if (currentRemaining > 0 && remainingPayment > 0) {
      const amountForCurrentSale = Math.min(
        remainingPayment,
        currentRemaining
      );

      allocationPlan.push({
        sale_id: sale._id,
        amount: amountForCurrentSale,
      });

      remainingPayment -= amountForCurrentSale;
    }

    // --------------------------------
    // 7B. PREVIOUS CUSTOMER INVOICES
    // OLDEST FIRST
    // --------------------------------

    if (
      remainingPayment > 0 &&
      customer &&
      company.payment_mode === "CREDIT"
    ) {
const previousSales = await Sale.find({
  company_id: companyId,
  customer_id: customer._id,
  _id: { $ne: sale._id },
})
  .session(session)
  .sort({ invoice_date: 1, createdAt: 1 })
  .lean();

      for (const previousSale of previousSales) {
        if (remainingPayment <= 0) break;
const previousAllocations =
  await PaymentAllocation.find({
    company_id: companyId,
    sale_id: previousSale._id,
  }).session(session).lean();

        const previousPaid = previousAllocations.reduce(
          (total, allocation) =>
            total + Number(allocation.amount || 0),
          0
        );

        const previousRemaining = Math.max(
          0,
          Number(previousSale.total_amount || 0) - previousPaid
        );

        if (previousRemaining <= 0) continue;

        const amountForPreviousSale = Math.min(
          remainingPayment,
          previousRemaining
        );

        allocationPlan.push({
          sale_id: previousSale._id,
          amount: amountForPreviousSale,
        });

        remainingPayment -= amountForPreviousSale;
      }
    }

    // --------------------------------
    // 7C. OPENING BALANCE
    // --------------------------------

let openingBalancePayment = 0;

if (
  remainingPayment > 0 &&
  customer &&
  company.payment_mode === "CREDIT"
) {
  // Original opening balance
  const originalOpeningBalance = Number(
    customer.opening_balance || 0
  );

  // Get previous payments made against opening balance
const openingBalancePayments = await CustomerLedger.find({
  company_id: companyId,
  customer_id: customer._id,
  type: "PAYMENT",
  sale_id: null,
  description: "Payment against opening balance",
}).session(session).lean();

  const openingBalancePaid = openingBalancePayments.reduce(
    (total, entry) =>
      total + Number(entry.credit || 0),
    0
  );

  // Remaining opening balance
  const remainingOpeningBalance = Math.max(
    0,
    originalOpeningBalance - openingBalancePaid
  );

  openingBalancePayment = Math.min(
    remainingPayment,
    remainingOpeningBalance
  );

  remainingPayment -= openingBalancePayment;
}

    // --------------------------------
    // 8. PAYMENT CANNOT EXCEED TOTAL
    // --------------------------------

    if (remainingPayment > 0.000001) {
      return res.status(400).json({
        success: false,
        message: "Payment cannot exceed total outstanding amount",
      });
    }

    // --------------------------------
    // 9. CREATE PAYMENT
    // --------------------------------

const [payment] = await Payment.create(
  [{
    company_id: companyId,
    customer_id: sale.customer_id,
    amount: paymentAmount,
    payment_method,
    reference_no: String(reference_no || "").trim(),
    remarks: String(remarks || "").trim(),
    received_by: userId,
  }],
  { session }
);
    // --------------------------------
    // 10. CREATE SALE ALLOCATIONS
    // --------------------------------

    const createdAllocations = [];

    for (const allocation of allocationPlan) {
const [createdAllocation] = await PaymentAllocation.create(
  [{
    company_id: companyId,
    payment_id: payment._id,
    sale_id: allocation.sale_id,
    amount: allocation.amount,
  }],
  { session }
);

      createdAllocations.push(createdAllocation);
    }

    // --------------------------------
// 11. CREATE CUSTOMER PAYMENT LEDGER
// --------------------------------

if (customer && company.payment_mode === "CREDIT") {
  // Payment applied to invoices
  for (const allocation of allocationPlan) {
  await CustomerLedger.create(
  [{
    company_id: companyId,
    customer_id: customer._id,
    type: "PAYMENT",
    sale_id: allocation.sale_id,
    payment_id: payment._id,
    debit: 0,
    credit: allocation.amount,
    description: "Payment against invoice",
    transaction_date: payment.payment_date,
  }],
  { session }
);
  }

  // Payment applied to original opening balance
if (openingBalancePayment > 0) {
  await CustomerLedger.create(
    [{
      company_id: companyId,
      customer_id: customer._id,
      type: "PAYMENT",
      sale_id: null,
      payment_id: payment._id,
      debit: 0,
      credit: openingBalancePayment,
      description: "Payment against opening balance",
      transaction_date: payment.payment_date,
    }],
    { session }
  );
}
  
}

    // --------------------------------
    // 12. CURRENT SALE NEW BALANCE
    // --------------------------------

    const currentPaymentAllocation =
      allocationPlan.find(
        (item) =>
          String(item.sale_id) === String(sale._id)
      );

    const currentPaymentAmount =
      Number(currentPaymentAllocation?.amount || 0);

    const newPaidAmount =
      currentAlreadyPaid + currentPaymentAmount;

    const newRemainingAmount = Math.max(
      0,
      Number(sale.total_amount || 0) -
        newPaidAmount
    );

    let status = "UNPAID";

    if (newRemainingAmount === 0) {
      status = "PAID";
    } else if (newPaidAmount > 0) {
      status = "PARTIAL";
    }

    // --------------------------------
    // 13. RESPONSE
    // --------------------------------

await session.commitTransaction();
await session.endSession();
    return res.status(201).json({
      
      success: true,
      message: "Payment recorded successfully",
      data: {
        payment_id: payment._id,
        sale_id: sale._id,
        invoice_no: sale.invoice_no,

        payment_amount: paymentAmount,

        current_invoice_paid: currentPaymentAmount,

        previous_invoices_paid:
          allocationPlan
            .filter(
              (item) =>
                String(item.sale_id) !==
                String(sale._id)
            )
            .reduce(
              (total, item) =>
                total + Number(item.amount || 0),
              0
            ),

        opening_balance_paid:
          openingBalancePayment,

        paid_amount: newPaidAmount,
        remaining_amount: newRemainingAmount,

        status,

        allocations: createdAllocations.map(
          (allocation) => ({
            allocation_id: allocation._id,
            sale_id: allocation.sale_id,
            amount: allocation.amount,
          })
        ),
      },
    });
} catch (error) {
  if (transactionStarted) {
    await session.abortTransaction();
  }

  await session.endSession();

  console.error("Create payment error:", error);

  return res.status(500).json({
    success: false,
    message: "Failed to create payment",
    error: error.message,
  });
}
};

// ================= GET PAYMENTS =================

// ================= GET PAYMENTS =================

export const getPayments = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { customer_id } = req.query;

    console.log("🔥 GET PAYMENTS HIT");
    console.log("🔥 COMPANY:", companyId);
    console.log("🔥 CUSTOMER FILTER:", customer_id || "ALL");

    // --------------------------------
    // PAYMENT FILTER
    // --------------------------------

    const paymentFilter = {
      company_id: companyId,
    };

    if (customer_id) {
      paymentFilter.customer_id = customer_id;
    }

    // --------------------------------
    // GET PAYMENTS
    // --------------------------------

    const payments = await Payment.find(paymentFilter)
      .sort({
        payment_date: -1,
        createdAt: -1,
      })
      .lean();

    console.log("🔥 PAYMENTS FOUND:", payments.length);

    // --------------------------------
    // PAYMENT IDS
    // --------------------------------

    const paymentIds = payments.map(
      (payment) => payment._id
    );

    // --------------------------------
    // GET ALLOCATIONS
    // --------------------------------

    const allocations = paymentIds.length
      ? await PaymentAllocation.find({
          company_id: companyId,
          payment_id: { $in: paymentIds },
        }).lean()
      : [];

    // --------------------------------
    // GET SALES
    // --------------------------------

    const saleIds = allocations
      .map((allocation) => allocation.sale_id)
      .filter(Boolean);

    const sales = saleIds.length
      ? await Sale.find({
          company_id: companyId,
          _id: { $in: saleIds },
        })
          .select("_id invoice_no")
          .lean()
      : [];

    // --------------------------------
    // SALE MAP
    // --------------------------------

    const saleMap = new Map(
      sales.map((sale) => [
        String(sale._id),
        sale,
      ])
    );

    // --------------------------------
    // GROUP ALLOCATIONS BY PAYMENT
    // --------------------------------

    const allocationMap = new Map();

    for (const allocation of allocations) {
      const paymentId = String(allocation.payment_id);
      const sale = saleMap.get(
        String(allocation.sale_id)
      );

      if (!allocationMap.has(paymentId)) {
        allocationMap.set(paymentId, []);
      }

      allocationMap.get(paymentId).push({
        allocation_id: allocation._id,
        sale_id: allocation.sale_id,
        invoice_no: sale?.invoice_no || "-",
        amount: Number(allocation.amount || 0),
      });
    }

    // --------------------------------
    // FINAL RESULT
    // --------------------------------

    const result = payments.map((payment) => {
      const paymentAllocations =
        allocationMap.get(String(payment._id)) || [];

      return {
        ...payment,

        allocations: paymentAllocations,

        invoice_ids: paymentAllocations.map(
          (allocation) =>
            String(allocation.sale_id)
        ),

        invoice_no:
          paymentAllocations[0]?.invoice_no || "-",
      };
    });

    return res.status(200).json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error("❌ Get payments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
      error: error.message,
    });
  }
};
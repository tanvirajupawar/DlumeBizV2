import Payment from "../models/payment.model.js";
import PaymentAllocation from "../models/payment_allocation.model.js";
import Sale from "../models/sale.model.js";
import Company from "../models/company.model.js";
import Customer from "../models/customer.model.js";
import CustomerLedger from "../models/customer_ledger.model.js";
import CustomerReturn from "../models/customer_return.model.js";
import CustomerReturnAllocation from "../models/customer_return_allocation.model.js";
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
  payment_date,
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
// 3. FIND CURRENT SALE / CUSTOMER
// --------------------------------

let sale = null;
let customer = null;

// --------------------------------
// 3A. INVOICE SELECTED
// --------------------------------

if (sale_id) {
  sale = await Sale.findOne({
    _id: sale_id,
    company_id: companyId,
  }).session(session);

  if (!sale) {
    return res.status(404).json({
      success: false,
      message: "Sale not found",
    });
  }
}

// --------------------------------
// 3B. FIND CUSTOMER
// --------------------------------

const targetCustomerId = sale?.customer_id || customer_id;

if (targetCustomerId) {
  customer = await Customer.findOne({
    _id: targetCustomerId,
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

// --------------------------------
// 4. NON-CREDIT / WALK-IN RULES
// --------------------------------

if (sale) {
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
}

// --------------------------------
// 4A. RECEIPT ACCOUNT SNAPSHOT
// Previous outstanding EXCLUDES current invoice
// --------------------------------

let previousOutstanding = 0;

let openingBalanceReturnAmount = 0;

if (
  customer &&
  company.payment_mode === "CREDIT"
) {
  // Remaining opening balance
  const originalOpeningBalance = Number(
    customer.opening_balance || 0
  );

  const openingBalancePayments =
    await CustomerLedger.find({
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


const openingBalanceReturnRecords = await CustomerReturn.find({
  company_id: companyId,
  customer_id: customer._id,
})
  .session(session)
  .lean();

openingBalanceReturnAmount = 0;

for (const returnRecord of openingBalanceReturnRecords) {
  const returnAllocations = await CustomerReturnAllocation.find({
    company_id: companyId,
    return_id: returnRecord._id,
  })
    .session(session)
    .lean();

  const allocatedToInvoices = returnAllocations.reduce(
    (total, allocation) =>
      total + Number(allocation.amount || 0),
    0
  );

  const returnTotal = Number(
    returnRecord.total_amount ?? returnRecord.totalAmount ?? 0
  );

  openingBalanceReturnAmount += Math.max(
    0,
    Math.round((returnTotal - allocatedToInvoices) * 100) / 100
  );
}

const remainingOpeningBalance = Math.max(
  0,
  Math.round(
    (
      originalOpeningBalance -
      openingBalancePaid -
      openingBalanceReturnAmount
    ) * 100
  ) / 100
);


  // Previous customer invoices
  // Current invoice is explicitly excluded.
  const previousSales = await Sale.find({
    company_id: companyId,
    customer_id: customer._id,
    ...(sale?._id
      ? { _id: { $ne: sale._id } }
      : {}),
  })
    .session(session)
    .lean();

  let previousInvoicesOutstanding = 0;

  for (const previousSale of previousSales) {
    const previousAllocations =
      await PaymentAllocation.find({
        company_id: companyId,
        sale_id: previousSale._id,
      })
        .session(session)
        .lean();

    const previousPaid =
      previousAllocations.reduce(
        (total, allocation) =>
          total + Number(allocation.amount || 0),
        0
      );

   
const previousReturnAllocations =
  await CustomerReturnAllocation.find({
    company_id: companyId,
    sale_id: previousSale._id,
  })
    .session(session)
    .lean();

const previousReturned = previousReturnAllocations.reduce(
  (total, allocation) =>
    total + Number(allocation.amount || 0),
  0
);

const previousRemaining = Math.max(
  0,
  Math.round(
    (
      Number(previousSale.total_amount || 0) -
      previousPaid -
      previousReturned
    ) * 100
  ) / 100
);


    previousInvoicesOutstanding +=
      previousRemaining;
  }




previousOutstanding = Math.max(
  0,
  Math.round(
    (
      remainingOpeningBalance +
      previousInvoicesOutstanding
    ) * 100
  ) / 100
);


}

// --------------------------------
// 5. CURRENT SALE BALANCE
// --------------------------------

let currentAlreadyPaid = 0;
let currentRemaining = 0;

if (sale) {
  const currentAllocations = await PaymentAllocation.find({
    company_id: companyId,
    sale_id: sale._id,
  })
    .session(session)
    .lean();

  currentAlreadyPaid = currentAllocations.reduce(
    (total, allocation) =>
      total + Number(allocation.amount || 0),
    0
  );


const currentReturnAllocations =
  await CustomerReturnAllocation.find({
    company_id: companyId,
    sale_id: sale._id,
  })
    .session(session)
    .lean();

const currentAlreadyReturned = currentReturnAllocations.reduce(
  (total, allocation) =>
    total + Number(allocation.amount || 0),
  0
);

currentRemaining = Math.max(
  0,
  Math.round(
    (
      Number(sale.total_amount || 0) -
      currentAlreadyPaid -
      currentAlreadyReturned
    ) * 100
  ) / 100
);

}

// --------------------------------
// 6. CREDIT CUSTOMER
// --------------------------------

if (customer) {
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
// 7B. OPENING BALANCE
// --------------------------------

let openingBalancePayment = 0;

if (
  remainingPayment > 0 &&
  customer &&
  company.payment_mode === "CREDIT"
) {
  const originalOpeningBalance = Number(
    customer.opening_balance || 0
  );

  const openingBalancePayments = await CustomerLedger.find({
    company_id: companyId,
    customer_id: customer._id,
    type: "PAYMENT",
    sale_id: null,
    description: "Payment against opening balance",
  })
    .session(session)
    .lean();

  const openingBalancePaid = openingBalancePayments.reduce(
    (total, entry) =>
      total + Number(entry.credit || 0),
    0
  );

const remainingOpeningBalance = Math.max(
  0,
  Math.round(
    (
      originalOpeningBalance -
      openingBalancePaid -
      openingBalanceReturnAmount
    ) * 100
  ) / 100
);


  openingBalancePayment = Math.min(
    remainingPayment,
    remainingOpeningBalance
  );

  remainingPayment -= openingBalancePayment;
}


// --------------------------------
// 7C. PREVIOUS CUSTOMER INVOICES
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
  ...(sale?._id
    ? { _id: { $ne: sale._id } }
    : {}),
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
      })
        .session(session)
        .lean();


const previousPaid = previousAllocations.reduce(
  (total, allocation) =>
    total + Number(allocation.amount || 0),
  0
);

const previousReturnAllocations =
  await CustomerReturnAllocation.find({
    company_id: companyId,
    sale_id: previousSale._id,
  })
    .session(session)
    .lean();

const previousReturned = previousReturnAllocations.reduce(
  (total, allocation) =>
    total + Number(allocation.amount || 0),
  0
);

const previousRemaining = Math.max(
  0,
  Math.round(
    (
      Number(previousSale.total_amount || 0) -
      previousPaid -
      previousReturned
    ) * 100
  ) / 100
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

let netOutstandingBeforePayment = null;

    // --------------------------------
    // 8. PAYMENT CANNOT EXCEED TOTAL
    // --------------------------------

 
if (
  customer &&
  company.payment_mode === "CREDIT"
) {
  const allCustomerSales = await Sale.find({
    company_id: companyId,
    customer_id: customer._id,
  })
    .session(session)
    .lean();

  let totalInvoiceOutstanding = 0;

  for (const customerSale of allCustomerSales) {
    const allocations = await PaymentAllocation.find({
      company_id: companyId,
      sale_id: customerSale._id,
    })
      .session(session)
      .lean();

    const totalPaid = allocations.reduce(
      (sum, allocation) =>
        sum + Number(allocation.amount || 0),
      0
    );

 
const saleReturnAllocations =
  await CustomerReturnAllocation.find({
    company_id: companyId,
    sale_id: customerSale._id,
  })
    .session(session)
    .lean();

const totalReturned = saleReturnAllocations.reduce(
  (sum, allocation) =>
    sum + Number(allocation.amount || 0),
  0
);

totalInvoiceOutstanding += Math.max(
  0,
  Math.round(
    (
      Number(customerSale.total_amount || 0) -
      totalPaid -
      totalReturned
    ) * 100
  ) / 100
);

  }

  const originalOpeningBalance = Number(
    customer.opening_balance || 0
  );

  const openingBalancePayments = await CustomerLedger.find({
    company_id: companyId,
    customer_id: customer._id,
    type: "PAYMENT",
    sale_id: null,
    description: "Payment against opening balance",
  })
    .session(session)
    .lean();

  const openingBalancePaid = openingBalancePayments.reduce(
    (sum, entry) => sum + Number(entry.credit || 0),
    0
  );


const remainingOpeningBalance = Math.max(
  0,
  Math.round(
    (
      originalOpeningBalance -
      openingBalancePaid -
      openingBalanceReturnAmount
    ) * 100
  ) / 100
);



const netOutstanding = Math.max(
  0,
  Math.round(
    (
      remainingOpeningBalance +
      totalInvoiceOutstanding
    ) * 100
  ) / 100
);

  netOutstandingBeforePayment = netOutstanding;

  if (paymentAmount > netOutstanding + 0.000001) {
    return res.status(400).json({
      success: false,
      message: "Payment cannot exceed total outstanding amount after returns",
    });
  }
}

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
    customer_id: customer?._id || null,
    amount: paymentAmount,
    payment_method,

payment_date: payment_date || new Date().toISOString().slice(0, 10),

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

let currentPaymentAmount = 0;
let newPaidAmount = 0;
let newRemainingAmount = 0;
let status = "ALLOCATED";

if (sale) {
  const currentPaymentAllocation =
    allocationPlan.find(
      (item) =>
        String(item.sale_id) === String(sale._id)
    );

  currentPaymentAmount =
    Number(currentPaymentAllocation?.amount || 0);


const currentReturnAllocationsAfterPayment =
  await CustomerReturnAllocation.find({
    company_id: companyId,
    sale_id: sale._id,
  })
    .session(session)
    .lean();

const currentReturnedAfterPayment =
  currentReturnAllocationsAfterPayment.reduce(
    (total, allocation) =>
      total + Number(allocation.amount || 0),
    0
  );



newRemainingAmount = Math.max(
  0,
  Math.round(
    (
      Number(sale.total_amount || 0) -
      newPaidAmount -
      currentReturnedAfterPayment
    ) * 100
  ) / 100
);


  status = "UNPAID";

  if (newRemainingAmount === 0) {
    status = "PAID";
  } else if (newPaidAmount > 0) {
    status = "PARTIAL";
  }
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

    sale_id: sale?._id || null,

    invoice_no: sale?.invoice_no || null,

    customer_id: customer?._id || null,

    payment_amount: paymentAmount,

    current_invoice_paid: currentPaymentAmount,

    previous_invoices_paid:
      allocationPlan
        .filter(
          (item) =>
            !sale ||
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

// --------------------------------
// RECEIPT ACCOUNT VALUES
// --------------------------------

invoice_amount:
  Number(sale?.total_amount || 0),

previous_outstanding:
  previousOutstanding,

total_amount:
  previousOutstanding +
  Number(sale?.total_amount || 0),

total_paid:
  paymentAmount,

remaining_outstanding:
  customer && company.payment_mode === "CREDIT"
    ? Math.max(
        0,
        Number(
          (
            (netOutstandingBeforePayment ?? 0) -
            paymentAmount
          ).toFixed(2)
        )
      )
    : Math.max(
        0,
        previousOutstanding +
          Number(sale?.total_amount || 0) -
          paymentAmount
      ),

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
  console.error("❌ Create payment error:", error);

  if (transactionStarted) {
    try {
      await session.abortTransaction();
    } catch (abortError) {
      console.error("❌ Transaction abort error:", abortError);
    }
  }

  try {
    await session.endSession();
  } catch (sessionError) {
    console.error("❌ Session end error:", sessionError);
  }

  return res.status(500).json({
    success: false,
    message: "Failed to create payment",
    error: error.message,
  });
}
};

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
  .populate(
    "customer_id",
    "first_name last_name name company_name"
  )
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
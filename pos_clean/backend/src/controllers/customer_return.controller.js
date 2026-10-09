
import mongoose from "mongoose";
import Customer from "../models/customer.model.js";
import CustomerLedger from "../models/customer_ledger.model.js";
import CustomerReturn from "../models/customer_return.model.js";
import CustomerReturnItem from "../models/customer_return_item.model.js";
import Sale from "../models/sale.model.js";
import PaymentAllocation from "../models/payment_allocation.model.js";
import CustomerReturnCounter from "../models/customer_return_counter.model.js";
import CustomerReturnAllocation from "../models/customer_return_allocation.model.js";

export const createCustomerReturn = async (req, res) => {
  const session = await mongoose.startSession();
  let transactionStarted = false;

  try {
    const companyId = req.user.company_id;
    const userId = req.user._id;

    const { customer_id, items, description = "" } = req.body;

    if (!customer_id || !mongoose.isValidObjectId(customer_id)) {
      return res.status(400).json({
        success: false,
        message: "A valid customer is required for a return",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one return item is required",
      });
    }

    session.startTransaction();
    transactionStarted = true;

    const customer = await Customer.findOne({
      _id: customer_id,
      company_id: companyId,
      is_active: true,
    }).session(session);

    if (!customer) {
      await session.abortTransaction();
      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

// Protect the customer account from concurrent updates.

const customerVersion = Number(customer.account_version || 0);

const customerVersionFilter = {
  _id: customer._id,
  company_id: companyId,
  ...(customer.account_version == null
    ? {
        $or: [
          { account_version: { $exists: false } },
          { account_version: null },
        ],
      }
    : { account_version: customerVersion }),
};

const customerVersionUpdate = await Customer.updateOne(
  customerVersionFilter,
  {
    $inc: { account_version: 1 },
  },
  { session }
);

if (customerVersionUpdate.modifiedCount !== 1) {
  throw new Error(
    "Customer account was updated by another transaction. Please try again."
  );
}


    const preparedItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const qty = Number(item.qty);
      const price = Number(item.price);

      if (!Number.isFinite(qty) || qty <= 0) {
        await session.abortTransaction();
        transactionStarted = false;

        return res.status(400).json({
          success: false,
          message: "Return quantity must be greater than zero",
        });
      }

      if (!Number.isFinite(price) || price < 0) {
        await session.abortTransaction();
        transactionStarted = false;

        return res.status(400).json({
          success: false,
          message: "Return rate cannot be negative",
        });
      }

      const amount = Math.round(qty * price * 100) / 100;
      totalAmount += amount;

   preparedItems.push({
  company_id: companyId,
  description: String(
    item.product_name ||
    item.item_name ||
    item.name ||
    item.product ||
    item.description ||
    ""
  ).trim(),
  qty,
  price,
  amount,
});
    }

    totalAmount = Math.round(totalAmount * 100) / 100;

    if (totalAmount <= 0) {
      await session.abortTransaction();
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message: "Return amount must be greater than zero",
      });
    }

    // Calculate outstanding using the existing accounting approach.
    const sales = await Sale.find({
      company_id: companyId,
      customer_id,
    })
      .session(session)
      .lean();

    const saleIds = sales.map((sale) => sale._id);

    const allocations = saleIds.length
      ? await PaymentAllocation.find({
          company_id: companyId,
          sale_id: { $in: saleIds },
        })
          .session(session)
          .lean()
      : [];



    const totalSales = sales.reduce(
      (sum, sale) => sum + Number(sale.total_amount || 0),
      0
    );

    const invoicePayments = allocations.reduce(
      (sum, allocation) => sum + Number(allocation.amount || 0),
      0
    );

const openingBalancePayments = await CustomerLedger.find({
  company_id: companyId,
  customer_id,
  type: "PAYMENT",
  sale_id: null,
})
      .session(session)
      .lean();

    const openingBalancePaid = openingBalancePayments.reduce(
      (sum, entry) => sum + Number(entry.credit || 0),
      0
    );

    const openingBalance = Number(customer.opening_balance || 0);

// Calculate previous returns for this customer.
const previousReturns = await CustomerReturn.find({
  company_id: companyId,
  customer_id,
})
  .session(session)
  .select("total_amount")
  .lean();

const totalPreviousReturns = previousReturns.reduce(
  (sum, item) => sum + Number(item.total_amount || 0),
  0
);

// Current outstanding after payments and previous returns.
const currentOutstanding = Math.max(
  0,
  Math.round(
    (
      openingBalance -
      openingBalancePaid +
      totalSales -
      invoicePayments -
      totalPreviousReturns
    ) * 100
  ) / 100
);


    if (totalAmount > currentOutstanding + 0.000001) {
      await session.abortTransaction();
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message: `Return amount ₹${totalAmount.toFixed(
          2
        )} exceeds customer outstanding ₹${currentOutstanding.toFixed(2)}`,
        data: {
          outstanding: currentOutstanding,
          return_amount: totalAmount,
        },
      });
    }

// Generate a company-scoped return number atomically.
const counter = await CustomerReturnCounter.findOneAndUpdate(
  { company_id: companyId },
  { $inc: { next_number: 1 } },
  {
    new: true,
    upsert: true,
    setDefaultsOnInsert: false,
    session,
  }
);

const returnNo = `RET-${String(counter.next_number).padStart(5, "0")}`;




    const [returnRecord] = await CustomerReturn.create(
      [
        {
          company_id: companyId,
          customer_id,
          return_no: returnNo,
          return_mode: "CALCULATOR",
          subtotal: totalAmount,
          total_amount: totalAmount,
          description: String(description).trim(),
          created_by: userId,
        },
      ],
      { session }
    );

    await CustomerReturnItem.insertMany(
      preparedItems.map((item) => ({
        ...item,
        return_id: returnRecord._id,
      })),
      { session }
    );


    // Allocate the return against oldest unpaid invoices first (FIFO).
    const salePayments = await PaymentAllocation.find({
      company_id: companyId,
      sale_id: { $in: saleIds },
    })
      .session(session)
      .lean();

    const returnAllocations = await CustomerReturnAllocation.find({
      company_id: companyId,
      sale_id: { $in: saleIds },
    })
      .session(session)
      .lean();

    const paymentsBySale = new Map();
    for (const allocation of salePayments) {
      const key = String(allocation.sale_id);
      paymentsBySale.set(
        key,
        (paymentsBySale.get(key) || 0) + Number(allocation.amount || 0)
      );
    }

    const returnsBySale = new Map();
    for (const allocation of returnAllocations) {
      const key = String(allocation.sale_id);
      returnsBySale.set(
        key,
        (returnsBySale.get(key) || 0) + Number(allocation.amount || 0)
      );
    }

    // Oldest invoice first.
    const fifoSales = [...sales].sort(
      (a, b) =>
        new Date(a.invoice_date || a.createdAt).getTime() -
        new Date(b.invoice_date || b.createdAt).getTime()
    );

    let returnAmountToAllocate = totalAmount;
    const newReturnAllocations = [];

    for (const sale of fifoSales) {
      if (returnAmountToAllocate <= 0.000001) break;

      const saleKey = String(sale._id);
      const invoiceTotal = Number(sale.total_amount || 0);
      const alreadyPaid = paymentsBySale.get(saleKey) || 0;
      const alreadyReturned = returnsBySale.get(saleKey) || 0;

      const invoiceOutstanding = Math.max(
        0,
        Math.round(
          (invoiceTotal - alreadyPaid - alreadyReturned) * 100
        ) / 100
      );

      if (invoiceOutstanding <= 0.000001) continue;

      const amountToAllocate = Math.round(
        Math.min(returnAmountToAllocate, invoiceOutstanding) * 100
      ) / 100;

      if (amountToAllocate <= 0) continue;

      newReturnAllocations.push({
        company_id: companyId,
        return_id: returnRecord._id,
        sale_id: sale._id,
        amount: amountToAllocate,
      });

      returnAmountToAllocate = Math.round(
        (returnAmountToAllocate - amountToAllocate) * 100
      ) / 100;
    }

    if (newReturnAllocations.length > 0) {
      await CustomerReturnAllocation.insertMany(newReturnAllocations, {
        session,
      });
    }

    const allocatedReturnAmount = Math.round(
      (totalAmount - returnAmountToAllocate) * 100
    ) / 100;


    await CustomerLedger.create(
      [
        {
          company_id: companyId,
          customer_id,
          type: "RETURN",
          return_id: returnRecord._id,
          debit: 0,
          credit: totalAmount,
          description: `Return ${returnNo}`,
          transaction_date: returnRecord.return_date,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      message: "Customer return created successfully",
      data: {
        return_id: returnRecord._id,
        return_no: returnRecord.return_no,
        customer_id: returnRecord.customer_id,
        total_amount: totalAmount,
        outstanding_after_return: Math.round(
          (currentOutstanding - totalAmount) * 100
        ) / 100,
      },
    });
  } catch (error) {
    console.error("Create customer return error:", error);

    if (transactionStarted) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error("Return transaction abort error:", abortError);
      }
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create customer return",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};



export const getCustomerReturns = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { customer_id } = req.query;

    if (!customer_id || !mongoose.isValidObjectId(customer_id)) {
      return res.status(400).json({
        success: false,
        message: "A valid customer_id is required",
      });
    }

    const customer = await Customer.findOne({
      _id: customer_id,
      company_id: companyId,
    }).select("_id");

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const returns = await CustomerReturn.find({
      company_id: companyId,
      customer_id: customer._id,
    })
      .sort({ return_date: 1, createdAt: 1 })
      .lean();

    const returnIds = returns.map((item) => item._id);

    const returnItems = returnIds.length
      ? await CustomerReturnItem.find({
          company_id: companyId,
          return_id: { $in: returnIds },
        }).lean()
      : [];

    const itemsByReturn = new Map();

    for (const item of returnItems) {
      const key = String(item.return_id);

      if (!itemsByReturn.has(key)) {
        itemsByReturn.set(key, []);
      }

      itemsByReturn.get(key).push(item);
    }

    return res.status(200).json({
      success: true,
      data: returns.map((item) => ({
        ...item,
        type: "return",
        amount: Number(item.total_amount || 0),
        items: itemsByReturn.get(String(item._id)) || [],
      })),
    });
  } catch (error) {
    console.error("Get customer returns error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer returns",
      error: error.message,
    });
  }
};
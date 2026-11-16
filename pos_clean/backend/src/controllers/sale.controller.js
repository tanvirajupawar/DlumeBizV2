import Sale from "../models/sale.model.js";
import SaleItem from "../models/sale_item.model.js";
import Company from "../models/company.model.js";
import { getNextInvoiceNumber } from "../services/sale.service.js";
import Customer from "../models/customer.model.js";
import CustomerLedger from "../models/customer_ledger.model.js";
import PaymentAllocation from "../models/payment_allocation.model.js";
import Product from "../models/product.model.js";
import CustomerReturnAllocation from "../models/customer_return_allocation.model.js";
import mongoose from "mongoose";
import Payment from "../models/payment.model.js";
import Refund from "../models/refund.model.js";


export const createSale = async (req, res) => {
  try {
    const companyId = req.user.company_id;

const {
  source,
  sale_mode,
  customer_id,
  items,
  discount_amount = 0,
  transportation_details = "",
  invoice_date,
} = req.body;

console.log("📅 BACKEND RECEIVED invoice_date:", req.body.invoice_date);
console.log("📦 BACKEND RECEIVED BODY:", JSON.stringify(req.body, null, 2));

    // --------------------------------
    // 1. BASIC VALIDATION
    // --------------------------------

    if (!source || !["POS", "MOBILE"].includes(source)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sale source",
      });
    }

    if (!sale_mode || !["PRODUCT", "CALCULATOR"].includes(sale_mode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sale mode",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one sale item is required",
      });
    }

// Validate selected invoice/sale date
let selectedInvoiceDate = new Date();

if (invoice_date) {
  const parsedDate = new Date(invoice_date);

  if (Number.isNaN(parsedDate.getTime())) {
    return res.status(400).json({
      success: false,
      message: "Invalid invoice date",
    });
  }

  // Preserve the selected calendar date using local midnight.
  selectedInvoiceDate = parsedDate;
}

    // --------------------------------
    // 2. GET COMPANY
    // --------------------------------

    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    // --------------------------------
    // 3. CHECK COMPANY POS MODE
    // --------------------------------

    if (company.pos_mode !== sale_mode) {
      return res.status(400).json({
        success: false,
        message: `Company is configured for ${company.pos_mode} mode`,
      });
    }

  

// --------------------------------
// 4. VALIDATE CUSTOMER
// --------------------------------

// Walk-in customer is not a real MongoDB Customer
const normalizedCustomerId =
  customer_id === "walk-in" || !customer_id
    ? null
    : customer_id;


let customerForSale = null;

if (normalizedCustomerId) {
  customerForSale = await Customer.findOne({
    _id: normalizedCustomerId,
    company_id: companyId,
    is_active: true,
  });

  if (!customerForSale) {
    return res.status(404).json({
      success: false,
      message: "Customer not found",
    });
  }
}


    // --------------------------------
    // 5. VALIDATE DISCOUNT
    // --------------------------------

    const discount = Number(discount_amount);

    if (!Number.isFinite(discount) || discount < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid discount amount",
      });
    }

    // --------------------------------
    // 6. VALIDATE ITEMS + CALCULATE
    // --------------------------------

    const preparedItems = [];
    let subtotal = 0;

    for (const item of items) {

      console.log("🛍️ BAG DATA RECEIVED:", {
  product_name: item.product_name,
  qty: item.qty,
  bags: item.bags,
  units_per_bag: item.units_per_bag,
});
      const qty = Number(item.qty);
      const rate = Number(item.rate);

      if (!Number.isFinite(qty) || qty <= 0) {
        return res.status(400).json({
          success: false,
          message: "Item quantity must be greater than 0",
        });
      }

      if (!Number.isFinite(rate) || rate < 0) {
        return res.status(400).json({
          success: false,
          message: "Item rate cannot be negative",
        });
      }
let product = null;

if (sale_mode === "PRODUCT") {
  if (!item.product_id) {
    return res.status(400).json({
      success: false,
      message: "product_id is required for PRODUCT sale",
    });
  }

  product = await Product.findOne({
    _id: item.product_id,
    company_id: companyId,
  }).lean();

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }
}

      // CALCULATOR sale
      if (sale_mode === "CALCULATOR") {
        if (item.product_id) {
          return res.status(400).json({
            success: false,
            message: "product_id is not allowed for CALCULATOR sale",
          });
        }

     
      }

      const amount = qty * rate;

      subtotal += amount;

preparedItems.push({
  company_id: companyId,
  product_id: item.product_id || null,
product_name:
  item.product_name ||
  item.product ||
  product?.product ||
  "",
type:
  item.type ||
  item.product_type ||
  item.productType ||
  product?.type ||
  product?.product_type ||
  product?.productType ||
  product?.item_type ||
  "",
size:
  item.size ||
  item.product_size ||
  item.productSize ||
  item.size_name ||
  item.variant_size ||
  product?.size ||
  product?.product_size ||
  product?.productSize ||
  product?.size_name ||
  product?.variant_size ||
  "",
description: item.description || "",

  qty,
  bags: Number(item.bags) || 0,
  units_per_bag: Number(item.units_per_bag) || 0,

  rate,
  amount,
  unit: item.unit || "",
  hsn: item.hsn || "",
  gst_rate: 0,
});
    }

    // --------------------------------
    // 7. CALCULATE FINAL TOTAL
    // --------------------------------

    if (discount > subtotal) {
      return res.status(400).json({
        success: false,
        message: "Discount cannot be greater than subtotal",
      });
    }

    const totalAmount = subtotal - discount;


    
    // --------------------------------
    // CALCULATE PREVIOUS OUTSTANDING
    // --------------------------------

    let previousOutstanding = 0;

    if (normalizedCustomerId && customerForSale) {
      // Get this customer's existing invoices
      const previousSales = await Sale.find({
        company_id: companyId,
        customer_id: normalizedCustomerId,
      })
        .select("_id total_amount")
        .lean();

      const previousSaleIds = previousSales.map(
        (previousSale) => previousSale._id
      );

      // Calculate the total value of previous invoices
      const previousSalesTotal = previousSales.reduce(
        (sum, previousSale) =>
          sum + Number(previousSale.total_amount || 0),
        0
      );

// Calculate payments allocated to previous invoices
const previousAllocations = previousSaleIds.length
  ? await PaymentAllocation.find({
      company_id: companyId,
      sale_id: { $in: previousSaleIds },
    }).lean()
  : [];

const previousPaymentsTotal = previousAllocations.reduce(
  (sum, allocation) =>
    sum + Number(allocation.amount || 0),
  0
);

// Calculate returns allocated to previous invoices
const previousReturnAllocations = previousSaleIds.length
  ? await CustomerReturnAllocation.find({
      company_id: companyId,
      sale_id: { $in: previousSaleIds },
    }).lean()
  : [];

const previousReturnsTotal = previousReturnAllocations.reduce(
  (sum, allocation) =>
    sum + Number(allocation.amount || 0),
  0
);

const openingBalance = Number(
  customerForSale.opening_balance || 0
);

// Payments already applied to opening balance
const openingBalancePayments = await CustomerLedger.find({
  company_id: companyId,
  customer_id: normalizedCustomerId,
  type: "PAYMENT",
  sale_id: null,
  description: "Payment against opening balance",
}).lean();

const openingBalancePaid = openingBalancePayments.reduce(
  (sum, entry) => sum + Number(entry.credit || 0),
  0
);

const remainingOpeningBalance = Math.max(
  0,
  Number((openingBalance - openingBalancePaid).toFixed(2))
);

previousOutstanding = Number(
  (
    remainingOpeningBalance +
    previousSalesTotal -
    previousPaymentsTotal -
    previousReturnsTotal
  ).toFixed(2)
);
}

    // --------------------------------
    // 8. GENERATE INVOICE NUMBER
    // --------------------------------

    const invoiceNo = await getNextInvoiceNumber(companyId);

    // --------------------------------
    // 9. CREATE SALE
    // --------------------------------

    
const sale = await Sale.create({
  company_id: companyId,
  customer_id: normalizedCustomerId,

  source,
  sale_mode,

  invoice_no: invoiceNo,
invoice_date: selectedInvoiceDate,

  subtotal,
  discount_amount: discount,
  total_amount: totalAmount,

  previous_outstanding: previousOutstanding,

  // Transportation details
  transportation_details:
    typeof transportation_details === "string"
      ? transportation_details.trim()
      : "",

  created_by: req.user._id,
});

    // --------------------------------
    // 10. CREATE SALE ITEMS
    // --------------------------------

    const saleItems = preparedItems.map((item) => ({
      ...item,
      sale_id: sale._id,
    }));

    await SaleItem.insertMany(saleItems);


    // Update stock for PRODUCT sales only.
if (sale_mode === "PRODUCT") {
  const StockManagement = (await import(
    "../models/stock_management.model.js"
  )).default;

  for (const item of preparedItems) {
    const stock = await StockManagement.findOne({
      product_id: item.product_id,
      company_id: companyId,
    });

    if (!stock) {
      throw new Error(
        `Stock record not found for product ${item.product_id}`
      );
    }

    stock.out = Number(stock.out || 0) + item.qty;

    // The stock model recalculates total_stock = in - out.
    await stock.save();
  }
}

    // --------------------------------
// 11. CREATE CUSTOMER LEDGER ENTRY
// --------------------------------

if (
  company.payment_mode === "CREDIT" &&
  sale.customer_id
) {
  await CustomerLedger.create({
    company_id: companyId,
    customer_id: sale.customer_id,
    type: "SALE",
    sale_id: sale._id,
    debit: totalAmount,
    credit: 0,
    description: `Invoice ${sale.invoice_no}`,
    transaction_date: sale.invoice_date,
  });
}

    // --------------------------------
    // 12. RESPONSE
    // --------------------------------

    return res.status(201).json({
      success: true,
      message: "Sale created successfully",


data: {
  sale_id: sale._id,
  invoice_no: sale.invoice_no,
  invoice_date: sale.invoice_date,

  source: sale.source,
  sale_mode: sale.sale_mode,
  customer_id: sale.customer_id,

  subtotal: sale.subtotal,
  discount_amount: sale.discount_amount,
  total_amount: sale.total_amount,

  previous_outstanding: sale.previous_outstanding,
  transportation_details: sale.transportation_details,
},

    });
  } catch (error) {
    console.error("Create sale error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create sale",
      error: error.message,
    });
  }
};

export const getSales = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { customer_id } = req.query;

    console.log("🔥 GET SALES HIT");
    console.log("🔥 COMPANY:", companyId);
    console.log("🔥 CUSTOMER FILTER:", customer_id || "ALL");

    // --------------------------------
    // BUILD FILTER
    // --------------------------------

    const saleFilter = {
      company_id: companyId,
    };

    if (customer_id) {
      saleFilter.customer_id = customer_id;
    }

    // --------------------------------
    // GET SALES
    // --------------------------------

    const sales = await Sale.find(saleFilter)
      .populate("customer_id")
      .populate("created_by", "name email")
      .sort({ invoice_date: -1 })
      .lean();

    console.log("🔥 SALES FOUND:", sales.length);

    // --------------------------------
    // SALE IDS
    // --------------------------------

    const saleIds = sales.map((sale) => sale._id);

    // --------------------------------
    // GET SALE ITEMS
    // --------------------------------

  const saleItemsRaw = saleIds.length
  ? await SaleItem.find({
      company_id: companyId,
      sale_id: { $in: saleIds },
    })
     .populate("product_id", "product type size")
      .lean()
  : [];

const saleItems = saleItemsRaw.map((item) => {
  const product =
    item.product_id &&
    typeof item.product_id === "object"
      ? item.product_id
      : null;

return {
  ...item,

  // Keep product_id as an ID for the frontend
  product_id: product?._id || item.product_id || null,

  // Product name: saved snapshot first, current product as fallback
  product_name:
    item.product_name ||
    product?.product ||
    "",

  // Product type
  type:
    item.type ||
    product?.type ||
    product?.product_type ||
    product?.productType ||
    product?.item_type ||
    "",

  // Product size
  size:
    item.size ||
    product?.size ||
    product?.product_size ||
    product?.productSize ||
    product?.size_name ||
    product?.variant_size ||
    "",
};
});

    // --------------------------------
    // GET PAYMENT ALLOCATIONS
    // --------------------------------

    const paymentAllocations = saleIds.length
      ? await PaymentAllocation.find({
          company_id: companyId,
          sale_id: { $in: saleIds },
        }).lean()
      : [];


      // GET RETURN ALLOCATIONS
const returnAllocations = saleIds.length
  ? await CustomerReturnAllocation.find({
      company_id: companyId,
      sale_id: { $in: saleIds },
    }).lean()
  : [];


    // --------------------------------
    // CALCULATE PAID BY SALE
    // --------------------------------

    const paidBySale = {};

    for (const allocation of paymentAllocations) {
      const saleId = allocation.sale_id.toString();

      if (!paidBySale[saleId]) {
        paidBySale[saleId] = 0;
      }

      paidBySale[saleId] += Number(allocation.amount || 0);
    }


    // --------------------------------
// CALCULATE RETURNED BY SALE
// --------------------------------

const returnedBySale = {};

for (const allocation of returnAllocations) {
  const saleId = allocation.sale_id.toString();

  if (!returnedBySale[saleId]) {
    returnedBySale[saleId] = 0;
  }

  returnedBySale[saleId] += Number(allocation.amount || 0);
}


    // --------------------------------
    // GROUP ITEMS BY SALE
    // --------------------------------

    const itemsBySale = {};

    for (const item of saleItems) {
      const saleId = item.sale_id.toString();

      if (!itemsBySale[saleId]) {
        itemsBySale[saleId] = [];
      }

      itemsBySale[saleId].push(item);
    }

    // --------------------------------
    // FINAL DATA
    // --------------------------------

    const data = sales.map((sale) => {
      const saleId = sale._id.toString();

  const totalAmount = Number(sale.total_amount || 0);
const paidAmount = Number(paidBySale[saleId] || 0);
const returnedAmount = Number(returnedBySale[saleId] || 0);

const remainingAmount = Math.max(
  0,
  Number(
    (totalAmount - paidAmount - returnedAmount).toFixed(2)
  )
);

let status = "UNPAID";

if (remainingAmount === 0) {
  status = "PAID";
} else if (paidAmount > 0 || returnedAmount > 0) {
  status = "PARTIAL";
}

      return {
        ...sale,

      paid_amount: Number(paidAmount.toFixed(2)),
returned_amount: Number(returnedAmount.toFixed(2)),
remaining_amount: Number(remainingAmount.toFixed(2)),
status,

        items: itemsBySale[saleId] || [],
      };
    });

console.log(
  "SALE ITEM DEBUG:",
  JSON.stringify(
    data[0]?.items,
    null,
    2
  )
);

    return res.status(200).json({
      success: true,
      data,
    });

  } catch (error) {
    console.error("❌ Get sales error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch sales",
      error: error.message,
    });
  }
};



export const deleteSale = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { id } = req.params;

    // Validate invoice ID
    if (!/^[a-f\d]{24}$/i.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice ID",
      });
    }

    // Find invoice belonging to the logged-in company
    const sale = await Sale.findOne({
      _id: id,
      company_id: companyId,
    });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

// Do not delete invoices with payment or return allocations.
const allocations = await PaymentAllocation.find({
  company_id: companyId,
  sale_id: sale._id,
}).lean();

const returnAllocations = await CustomerReturnAllocation.find({
  company_id: companyId,
  sale_id: sale._id,
}).lean();

console.log("========== DELETE INVOICE DEBUG ==========");
console.log("Invoice No:", sale.invoice_no);
console.log("Sale ID:", sale._id.toString());
console.log("Company ID:", companyId);
console.log("Payment Allocations:", JSON.stringify(allocations, null, 2));
console.log("Return Allocations:", JSON.stringify(returnAllocations, null, 2));
console.log("==========================================");

if (allocations.length > 0 || returnAllocations.length > 0) {
  return res.status(409).json({
    success: false,
    message:
      "This invoice has payment or return records. Reverse or resolve the related records before deleting it.",
  });
}

    // Load invoice items
    const items = await SaleItem.find({
      company_id: companyId,
      sale_id: sale._id,
    }).lean();

    // For PRODUCT sales, prepare stock rollback
    let stockUpdates = [];

    if (sale.sale_mode === "PRODUCT") {
      const StockManagement = (
        await import("../models/stock_management.model.js")
      ).default;

      const quantitiesByProduct = new Map();

      for (const item of items) {
        if (!item.product_id) continue;

        const productId = item.product_id.toString();

        quantitiesByProduct.set(
          productId,
          (quantitiesByProduct.get(productId) || 0) +
            Number(item.qty || 0)
        );
      }

      // Validate every stock record before changing anything
      for (const [productId, qty] of quantitiesByProduct) {
        const stock = await StockManagement.findOne({
          company_id: companyId,
          product_id: productId,
        });

        if (!stock) {
          return res.status(409).json({
            success: false,
            message:
              `Cannot delete invoice: stock record missing for product ${productId}.`,
          });
        }

        if (Number(stock.out || 0) < qty) {
          return res.status(409).json({
            success: false,
            message:
              `Cannot safely restore stock for product ${productId}. Please check stock records first.`,
          });
        }

        stockUpdates.push({ stock, qty });
      }
    }

    // Restore stock before removing the invoice
    for (const { stock, qty } of stockUpdates) {
      stock.out = Number(stock.out || 0) - qty;
      await stock.save();
    }

    // Remove invoice items
    await SaleItem.deleteMany({
      company_id: companyId,
      sale_id: sale._id,
    });

    // Remove only the ledger entry created for this sale
    await CustomerLedger.deleteMany({
      company_id: companyId,
      sale_id: sale._id,
      type: "SALE",
    });

    // Remove invoice
    await Sale.deleteOne({
      _id: sale._id,
      company_id: companyId,
    });

    return res.status(200).json({
      success: true,
      message: "Invoice deleted successfully",
      data: {
        sale_id: sale._id,
        invoice_no: sale.invoice_no,
      },
    });
  } catch (error) {
    console.error("Delete sale error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete invoice",
      error: error.message,
    });
  }
};



export const updateSale = async (req, res) => {
  const session = await mongoose.startSession();

  let responseData = null;
  let responseStatus = 200;
  let responseError = null;

  try {
    await session.withTransaction(async () => {
      const companyId = req.user.company_id;
      const { id } = req.params;

      const fail = (status, message) => {
        const error = new Error(message);
        error.statusCode = status;
        throw error;
      };

      if (!/^[a-f\d]{24}$/i.test(id)) {
        fail(400, "Invalid invoice ID");
      }

      const sale = await Sale.findOne({
        _id: id,
        company_id: companyId,
      }).session(session);

      if (!sale) fail(404, "Invoice not found");

const {
  source = sale.source,
  sale_mode = sale.sale_mode,
  customer_id = sale.customer_id,
  items,
  discount_amount = 0,
  transportation_details = "",
  invoice_date,
  confirmRefund = false,
} = req.body;

console.log("🔥 CONFIRM REFUND VALUE:", confirmRefund);
console.log("🔥 UPDATE REQUEST BODY:", req.body);


      if (!["POS", "MOBILE"].includes(source)) {
        fail(400, "Invalid sale source");
      }

      if (sale_mode !== sale.sale_mode) {
        fail(400, "Changing the invoice sale mode is not allowed.");
      }

      if (!Array.isArray(items) || items.length === 0) {
        fail(400, "At least one sale item is required");
      }

      const company = await Company.findById(companyId).session(session);

      if (!company || company.pos_mode !== sale_mode) {
        fail(400, "Company POS mode does not match this invoice.");
      }

      const normalizedCustomerId =
        customer_id === "walk-in" || !customer_id
          ? null
          : customer_id;

      const oldPaymentAllocations = await PaymentAllocation.find({
        company_id: companyId,
        sale_id: sale._id,
      }).session(session).lean();




const oldOpeningBalancePayments = normalizedCustomerId
  ? await CustomerLedger.find({
      company_id: companyId,
      customer_id: normalizedCustomerId,
      type: "PAYMENT",
      source_sale_id: sale._id,
      sale_id: null,
      description: "Payment against opening balance",
    })
      .session(session)
      .lean()
  : [];


      const oldReturnAllocations = await CustomerReturnAllocation.find({
        company_id: companyId,
        sale_id: sale._id,
      }).session(session).lean();

      if (
        (oldPaymentAllocations.length || oldReturnAllocations.length) &&
        String(normalizedCustomerId || "") !==
          String(sale.customer_id || "")
      ) {
        fail(
          409,
          "Customer cannot be changed because this invoice has payment or return history."
        );
      }

      let customer = null;

      if (normalizedCustomerId) {
        customer = await Customer.findOne({
          _id: normalizedCustomerId,
          company_id: companyId,
          is_active: true,
        }).session(session);

        if (!customer) fail(404, "Customer not found");
      }

      const discount = Number(discount_amount);

      if (!Number.isFinite(discount) || discount < 0) {
        fail(400, "Invalid discount amount");
      }

      const preparedItems = [];
      let subtotal = 0;

      for (const item of items) {
        const qty = Number(item.qty);
        const rate = Number(item.rate);

        if (!Number.isFinite(qty) || qty <= 0) {
          fail(400, "Item quantity must be greater than 0");
        }

        if (!Number.isFinite(rate) || rate < 0) {
          fail(400, "Item rate cannot be negative");
        }

        let product = null;

        if (sale_mode === "PRODUCT") {
          if (!item.product_id) {
            fail(400, "product_id is required for PRODUCT sale");
          }

          product = await Product.findOne({
            _id: item.product_id,
            company_id: companyId,
          }).session(session).lean();

          if (!product) fail(404, "Product not found");
        } else if (item.product_id) {
          fail(400, "product_id is not allowed for CALCULATOR sale");
        }

        const amount = Number((qty * rate).toFixed(2));
        subtotal += amount;

        preparedItems.push({
          company_id: companyId,
          product_id: sale_mode === "PRODUCT" ? item.product_id : null,
          product_name:
            item.product_name || item.product || product?.product || "",
          type:
            item.type ||
            item.product_type ||
            product?.type ||
            product?.product_type ||
            "",
          size:
            item.size ||
            item.product_size ||
            product?.size ||
            product?.product_size ||
            "",
          description: item.description || "",
          qty,
          bags: Number(item.bags) || 0,
          units_per_bag: Number(item.units_per_bag) || 0,
          rate,
          amount,
          unit: item.unit || "",
          hsn: item.hsn || "",
          gst_rate: 0,
        });
      }

      subtotal = Number(subtotal.toFixed(2));

      if (discount > subtotal) {
        fail(400, "Discount cannot be greater than subtotal");
      }

      const totalAmount = Number((subtotal - discount).toFixed(2));

// Update invoice date when editing
let selectedInvoiceDate = sale.invoice_date || new Date();

if (invoice_date) {
  const parsedDate = new Date(`${invoice_date}T12:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    fail(400, "Invalid invoice date");
  }

  selectedInvoiceDate = parsedDate;
}

      // ------------------------------------------------
      // 1. LOAD CUSTOMER INVOICES AND THEIR ALLOCATIONS
      // ------------------------------------------------

      const customerSales = normalizedCustomerId
        ? await Sale.find({
            company_id: companyId,
            customer_id: normalizedCustomerId,
            _id: { $ne: sale._id },
          })
            .sort({ invoice_date: 1, _id: 1 })
            .session(session)
            .lean()
        : [];

      const otherSaleIds = customerSales.map((s) => s._id);

      const otherPaymentAllocations = otherSaleIds.length
        ? await PaymentAllocation.find({
            company_id: companyId,
            sale_id: { $in: otherSaleIds },
          }).session(session).lean()
        : [];

      const otherReturnAllocations = otherSaleIds.length
        ? await CustomerReturnAllocation.find({
            company_id: companyId,
            sale_id: { $in: otherSaleIds },
          }).session(session).lean()
        : [];

      // Remove this invoice's old allocations from the allocation
      // calculation. They will be redistributed below.
      const paymentSources = [];

      for (const allocation of oldPaymentAllocations) {
        paymentSources.push({
          paymentId: allocation.payment_id,
          amount: Number(allocation.amount || 0),
        });
      }

      // Include payment amounts previously allocated to opening balance.
for (const entry of oldOpeningBalancePayments) {
  paymentSources.push({
    paymentId: entry.payment_id,
    amount: Number(entry.credit || 0),
  });
}

      const returnSources = [];

      for (const allocation of oldReturnAllocations) {
        returnSources.push({
          returnId: allocation.return_id,
          amount: Number(allocation.amount || 0),
        });
      }

      // Group repeated allocations for the same payment/return.
      const groupSources = (sources, key) => {
        const grouped = new Map();

        for (const sourceItem of sources) {
          const sourceId = String(sourceItem[key]);
          grouped.set(
            sourceId,
            (grouped.get(sourceId) || 0) + sourceItem.amount
          );
        }

        return [...grouped.entries()].map(([sourceId, amount]) => ({
          sourceId,
          amount: Number(amount.toFixed(2)),
        }));
      };

      const groupedPayments = groupSources(paymentSources, "paymentId");
      const groupedReturns = groupSources(returnSources, "returnId");

      // Check that source records belong to this customer/company.
      const paymentIds = groupedPayments.map((p) => p.sourceId);
      const returnIds = groupedReturns.map((r) => r.sourceId);

      const payments = paymentIds.length
        ? await Payment.find({
            _id: { $in: paymentIds },
            company_id: companyId,
            customer_id: normalizedCustomerId,
          }).session(session).lean()
        : [];

      if (payments.length !== paymentIds.length) {
        fail(409, "One or more payment records could not be verified.");
      }

      const CustomerReturn = (
        await import("../models/customer_return.model.js")
      ).default;

      const returns = returnIds.length
        ? await CustomerReturn.find({
            _id: { $in: returnIds },
            company_id: companyId,
            customer_id: normalizedCustomerId,
          }).session(session).lean()
        : [];

      if (returns.length !== returnIds.length) {
        fail(409, "One or more return records could not be verified.");
      }

      // ------------------------------------------------
      // 2. CALCULATE AVAILABLE BALANCE FOR EACH INVOICE
      // ------------------------------------------------

      const paymentBySale = new Map();
      const returnBySale = new Map();

      for (const allocation of otherPaymentAllocations) {
        const key = String(allocation.sale_id);
        paymentBySale.set(
          key,
          (paymentBySale.get(key) || 0) + Number(allocation.amount || 0)
        );
      }

      for (const allocation of otherReturnAllocations) {
        const key = String(allocation.sale_id);
        returnBySale.set(
          key,
          (returnBySale.get(key) || 0) + Number(allocation.amount || 0)
        );
      }

      const capacities = new Map();

      capacities.set(
        String(sale._id),
        totalAmount
      );

      for (const otherSale of customerSales) {
        const key = String(otherSale._id);

        const alreadyCredited =
          Number(paymentBySale.get(key) || 0) +
          Number(returnBySale.get(key) || 0);

        capacities.set(
          key,
          Math.max(
            0,
            Number(
              (Number(otherSale.total_amount || 0) - alreadyCredited).toFixed(2)
            )
          )
        );
      }


      // Calculate opening-balance capacity.
// Add back the amount being redistributed from this invoice.
let openingBalanceCapacity = 0;

if (normalizedCustomerId && customer) {
  const openingBalance = Number(customer.opening_balance || 0);

  const allOpeningBalancePayments = await CustomerLedger.find({
    company_id: companyId,
    customer_id: normalizedCustomerId,
    type: "PAYMENT",
    sale_id: null,
    description: "Payment against opening balance",
  }).session(session).lean();

  const totalOpeningBalancePaid = allOpeningBalancePayments.reduce(
    (sum, entry) => sum + Number(entry.credit || 0),
    0
  );

  const oldOpeningBalancePaid = oldOpeningBalancePayments.reduce(
    (sum, entry) => sum + Number(entry.credit || 0),
    0
  );

  openingBalanceCapacity = Math.max(
    0,
    Number(
      (
        openingBalance -
        totalOpeningBalancePaid +
        oldOpeningBalancePaid
      ).toFixed(2)
    )
  );
}


    // ------------------------------------------------
// 3. REDISTRIBUTE PAYMENTS AND RETURNS CHRONOLOGICALLY
//    EDITED INVOICE FIRST, THEN OLDEST INVOICES FIFO
// ------------------------------------------------

const paymentTargets = [];
const returnTargets = [];

const allocationSources = [
  ...groupedPayments.map((source) => {
    const payment = payments.find(
      (p) => String(p._id) === source.sourceId
    );

    return {
      type: "PAYMENT",
      sourceId: source.sourceId,
      amount: source.amount,
      date: new Date(payment?.payment_date || 0),
    };
  }),

  ...groupedReturns.map((source) => {
    const customerReturn = returns.find(
      (r) => String(r._id) === source.sourceId
    );

    return {
      type: "RETURN",
      sourceId: source.sourceId,
      amount: source.amount,
      date: new Date(customerReturn?.return_date || 0),
    };
  }),
];

// Process older credit sources first.
// Use source ID as a stable tie-breaker for equal dates.
allocationSources.sort((a, b) => {
  const dateDifference = a.date.getTime() - b.date.getTime();

  if (dateDifference !== 0) return dateDifference;

  return a.sourceId.localeCompare(b.sourceId);
});

for (const source of allocationSources) {
  let remaining = source.amount;

  // First allocate to the edited invoice.
  const editedCapacity = capacities.get(String(sale._id)) || 0;
  const keepHere = Math.min(remaining, editedCapacity);

  if (keepHere > 0) {
    if (source.type === "PAYMENT") {
      paymentTargets.push({
        paymentId: source.sourceId,
        saleId: sale._id,
        amount: Number(keepHere.toFixed(2)),
      });
    } else {
      returnTargets.push({
        returnId: source.sourceId,
        saleId: sale._id,
        amount: Number(keepHere.toFixed(2)),
      });
    }

    capacities.set(
      String(sale._id),
      Number((editedCapacity - keepHere).toFixed(2))
    );

    remaining = Number((remaining - keepHere).toFixed(2));
  }


    // After the edited invoice, allocate payment to opening balance.
if (source.type === "PAYMENT" && remaining > 0) {
  const openingBalancePayment = Math.min(
    remaining,
    openingBalanceCapacity
  );

  if (openingBalancePayment > 0) {
const paymentSource = groupedPayments.find(
  (payment) => payment.sourceId === source.sourceId
);

if (paymentSource) {
  paymentSource.openingBalanceAmount = Number(
    openingBalancePayment.toFixed(2)
  );
}
    openingBalanceCapacity = Number(
      (openingBalanceCapacity - openingBalancePayment).toFixed(2)
    );

    remaining = Number(
      (remaining - openingBalancePayment).toFixed(2)
    );
  }
}

  // Then allocate to other outstanding invoices, oldest first.
  for (const otherSale of customerSales) {
    if (remaining <= 0) break;

    const key = String(otherSale._id);
    const available = capacities.get(key) || 0;

    if (available <= 0) continue;

    const moved = Math.min(remaining, available);

    if (source.type === "PAYMENT") {
      paymentTargets.push({
        paymentId: source.sourceId,
        saleId: otherSale._id,
        amount: Number(moved.toFixed(2)),
      });
    } else {
      returnTargets.push({
        returnId: source.sourceId,
        saleId: otherSale._id,
        amount: Number(moved.toFixed(2)),
      });
    }

    capacities.set(
      key,
      Number((available - moved).toFixed(2))
    );

    remaining = Number((remaining - moved).toFixed(2));
  }



  // Payment excess requires a refund before editing.
// Track excess payment for refund confirmation.
if (source.type === "PAYMENT") {
  const paymentSource = groupedPayments.find(
    (p) => p.sourceId === source.sourceId
  );

  paymentSource.unallocated = Number(remaining.toFixed(2));

  if (paymentSource.unallocated > 0 && !confirmRefund) {
    const error = new Error(
      `An excess payment of ₹${paymentSource.unallocated.toFixed(2)} must be refunded.`
    );

    error.statusCode = 409;
    error.requiresRefund = true;
    error.refundAmount = paymentSource.unallocated;
    error.paymentId = source.sourceId;

    throw error;
  }
} else {
    // Keep excess return credit unallocated.
    const returnSource = groupedReturns.find(
      (r) => r.sourceId === source.sourceId
    );

    returnSource.unallocated = Number(remaining.toFixed(2));
  }
}

      // ------------------------------------------------
      // 5. REPLACE PAYMENT ALLOCATIONS
      // ------------------------------------------------

      await PaymentAllocation.deleteMany({
        company_id: companyId,
        sale_id: sale._id,
      }).session(session);

      // Merge with any existing allocation for same payment + invoice.
      for (const target of paymentTargets) {
        const existing = await PaymentAllocation.findOne({
          company_id: companyId,
          payment_id: target.paymentId,
          sale_id: target.saleId,
        }).session(session);

        if (existing) {
          existing.amount = Number(
            (Number(existing.amount || 0) + target.amount).toFixed(2)
          );
          await existing.save({ session });
        } else {
          await PaymentAllocation.create(
            [{
              company_id: companyId,
              payment_id: target.paymentId,
              sale_id: target.saleId,
              amount: target.amount,
            }],
            { session }
          );
        }
      }

      // ------------------------------------------------
      // 6. REPLACE RETURN ALLOCATIONS
      // ------------------------------------------------

      await CustomerReturnAllocation.deleteMany({
        company_id: companyId,
        sale_id: sale._id,
      }).session(session);

      for (const target of returnTargets) {
        const existing = await CustomerReturnAllocation.findOne({
          company_id: companyId,
          return_id: target.returnId,
          sale_id: target.saleId,
        }).session(session);

        if (existing) {
          existing.amount = Number(
            (Number(existing.amount || 0) + target.amount).toFixed(2)
          );
          await existing.save({ session });
        } else {
          await CustomerReturnAllocation.create(
            [{
              company_id: companyId,
              return_id: target.returnId,
              sale_id: target.saleId,
              amount: target.amount,
            }],
            { session }
          );
        }
      }

      
// Rebuild payment ledger entries only for real customers.
// Walk-in invoices do not have CustomerLedger entries.
if (normalizedCustomerId) {
  for (const paymentSource of groupedPayments) {
    const payment = payments.find(
      (p) => String(p._id) === paymentSource.sourceId
    );

    if (!payment) {
      fail(409, "Payment record not found during ledger update.");
    }

    await CustomerLedger.deleteMany({
      company_id: companyId,
      customer_id: normalizedCustomerId,
      type: "PAYMENT",
      payment_id: payment._id,
      description: "Payment against invoice",
    }).session(session);


    // Remove the previous opening-balance ledger entry.
await CustomerLedger.deleteMany({
  company_id: companyId,
  customer_id: normalizedCustomerId,
  type: "PAYMENT",
  payment_id: payment._id,
  sale_id: null,
  source_sale_id: sale._id,
  description: "Payment against opening balance",
}).session(session);

// Save the amount allocated to opening balance.
if (Number(paymentSource.openingBalanceAmount || 0) > 0) {
  await CustomerLedger.create(
    [{
      company_id: companyId,
      customer_id: normalizedCustomerId,
      type: "PAYMENT",
      sale_id: null,
      source_sale_id: sale._id,
      payment_id: payment._id,
      debit: 0,
      credit: Number(paymentSource.openingBalanceAmount.toFixed(2)),
      description: "Payment against opening balance",
      transaction_date: payment.payment_date,
    }],
    { session }
  );
}

    const allPaymentAllocations = await PaymentAllocation.find({
      company_id: companyId,
      payment_id: payment._id,
    })
      .session(session)
      .lean();

    for (const allocation of allPaymentAllocations) {
      await CustomerLedger.create(
        [{
          company_id: companyId,
          customer_id: normalizedCustomerId,
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

    // Create refund ledger entry for confirmed excess payment.
// Create refund record and ledger entry for confirmed excess payment.
if (confirmRefund && Number(paymentSource.unallocated || 0) > 0) {
  const refundAmount = Number(paymentSource.unallocated.toFixed(2));

  await Refund.create(
    [
      {
        company_id: companyId,
        customer_id: normalizedCustomerId,
        payment_id: payment._id,
        sale_id: sale._id,
        amount: refundAmount,
        refund_method: payment.payment_method,
        refund_date: new Date(),
        remarks: `Excess payment refunded for invoice ${sale.invoice_no}`,
        status: "COMPLETED",
        refunded_by: req.user._id,
      },
    ],
    { session }
  );

  await CustomerLedger.create(
    [
      {
        company_id: companyId,
        customer_id: normalizedCustomerId,
        type: "REFUND",
        sale_id: null,
        source_sale_id: sale._id,
        payment_id: payment._id,
        debit: refundAmount,
        credit: 0,
        description: `Excess payment refunded for invoice ${sale.invoice_no}`,
        transaction_date: new Date(),
      },
    ],
    { session }
  );
}
  }
}



      

      // ------------------------------------------------
      // 8. UPDATE STOCK
      // ------------------------------------------------

      const StockManagement = (
        await import("../models/stock_management.model.js")
      ).default;

      const oldItems = await SaleItem.find({
        company_id: companyId,
        sale_id: sale._id,
      }).session(session).lean();

      const oldQtyByProduct = new Map();
      const newQtyByProduct = new Map();

      if (sale_mode === "PRODUCT") {
        for (const item of oldItems) {
          if (!item.product_id) continue;

          const key = String(item.product_id);
          oldQtyByProduct.set(
            key,
            (oldQtyByProduct.get(key) || 0) + Number(item.qty || 0)
          );
        }

        for (const item of preparedItems) {
          if (!item.product_id) continue;

          const key = String(item.product_id);
          newQtyByProduct.set(
            key,
            (newQtyByProduct.get(key) || 0) + Number(item.qty || 0)
          );
        }
      }

      const productIds = new Set([
        ...oldQtyByProduct.keys(),
        ...newQtyByProduct.keys(),
      ]);

      for (const productId of productIds) {
        const difference =
          (newQtyByProduct.get(productId) || 0) -
          (oldQtyByProduct.get(productId) || 0);

        if (difference === 0) continue;

        const stock = await StockManagement.findOne({
          company_id: companyId,
          product_id: productId,
        }).session(session);

        if (!stock) {
          fail(409, `Stock record missing for product ${productId}.`);
        }

        if (Number(stock.out || 0) + difference < 0) {
          fail(409, `Cannot safely adjust stock for product ${productId}.`);
        }

        stock.out = Number(stock.out || 0) + difference;
        await stock.save({ session });
      }

      // ------------------------------------------------
      // 9. SAVE EDITED INVOICE WITHOUT CHANGING INVOICE NO
      // ------------------------------------------------

      sale.customer_id = normalizedCustomerId;
      sale.source = source;
      sale.invoice_date = selectedInvoiceDate;
      sale.subtotal = subtotal;
      sale.discount_amount = discount;
      sale.total_amount = totalAmount;
      sale.transportation_details =
        typeof transportation_details === "string"
          ? transportation_details.trim()
          : "";

      await sale.save({ session });

      await SaleItem.deleteMany({
        company_id: companyId,
        sale_id: sale._id,
      }).session(session);

      await SaleItem.insertMany(
        preparedItems.map((item) => ({
          ...item,
          sale_id: sale._id,
        })),
        { session }
      );

  // ------------------------------------------------
// 10. UPDATE EXISTING SALE LEDGER ENTRY
// ------------------------------------------------

if (company.payment_mode === "CREDIT" && sale.customer_id) {

  const existingLedgerEntry = await CustomerLedger.findOne({
    company_id: companyId,
    sale_id: sale._id,
    type: "SALE",
  }).session(session);

  if (existingLedgerEntry) {

    // Update the existing posting without changing its position.
    existingLedgerEntry.customer_id = sale.customer_id;
    existingLedgerEntry.debit = totalAmount;
    existingLedgerEntry.credit = 0;
    existingLedgerEntry.description = `Invoice ${sale.invoice_no}`;

existingLedgerEntry.transaction_date = sale.invoice_date;

await existingLedgerEntry.save({ session });

  } else {

    // Create only if this invoice does not already have a ledger entry.
    await CustomerLedger.create(
      [{
        company_id: companyId,
        customer_id: sale.customer_id,
        type: "SALE",
        sale_id: sale._id,
        debit: totalAmount,
        credit: 0,
        description: `Invoice ${sale.invoice_no}`,
        transaction_date: sale.invoice_date,
      }],
      { session }
    );
  }

} else {

  // Remove SALE ledger entry if this invoice is no longer a credit sale.
  await CustomerLedger.deleteMany({
    company_id: companyId,
    sale_id: sale._id,
    type: "SALE",
  }).session(session);

}

      responseData = {
        sale_id: sale._id,
        invoice_no: sale.invoice_no,
        invoice_date: sale.invoice_date,
        customer_id: sale.customer_id,
        subtotal: sale.subtotal,
        discount_amount: sale.discount_amount,
        total_amount: sale.total_amount,
        transportation_details: sale.transportation_details,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Invoice updated successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("Update sale error:", error);

    responseStatus = error.statusCode || 500;
    responseError = error;

return res.status(responseStatus).json({
  success: false,
  message:
    responseStatus === 500
      ? "Failed to update invoice"
      : error.message,
  error: responseStatus === 500 ? error.message : undefined,

  requiresRefund: error.requiresRefund || false,
  refundAmount: error.refundAmount || 0,
  paymentId: error.paymentId || null,
});
  } finally {
    await session.endSession();
  }
};


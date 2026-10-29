import Sale from "../models/sale.model.js";
import SaleItem from "../models/sale_item.model.js";
import Company from "../models/company.model.js";
import { getNextInvoiceNumber } from "../services/sale.service.js";
import Customer from "../models/customer.model.js";
import CustomerLedger from "../models/customer_ledger.model.js";
import PaymentAllocation from "../models/payment_allocation.model.js";
import Product from "../models/product.model.js";


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

      // Calculate payments allocated to those invoices
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

      const openingBalance = Number(
        customerForSale.opening_balance || 0
      );

      previousOutstanding = Number(
        (
          openingBalance +
          previousSalesTotal -
          previousPaymentsTotal
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

    // Prefer saved snapshots; fall back to the current product
    type:
      item.type ||
      product?.type ||
      product?.product_type ||
      product?.productType ||
      product?.item_type ||
      "",

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

      const remainingAmount = Math.max(
        0,
        totalAmount - paidAmount
      );

      let status = "UNPAID";

      if (remainingAmount === 0) {
        status = "PAID";
      } else if (paidAmount > 0) {
        status = "PARTIAL";
      }

      return {
        ...sale,

        paid_amount: Number(paidAmount.toFixed(2)),
        remaining_amount: Number(remainingAmount.toFixed(2)),
        status,

        items: itemsBySale[saleId] || [],
      };
    });

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

    // Do not delete invoices with recorded payments
const allocations = await PaymentAllocation.find({
  company_id: companyId,
  sale_id: sale._id,
}).lean();

console.log("========== DELETE INVOICE DEBUG ==========");
console.log("Invoice No:", sale.invoice_no);
console.log("Sale ID:", sale._id.toString());
console.log("Company ID:", companyId);
console.log("Allocations:", JSON.stringify(allocations, null, 2));
console.log("==========================================");

if (allocations.length > 0) {
  return res.status(409).json({
    success: false,
    message:
      "This invoice has payment records. Record the appropriate reversal before deleting it.",
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

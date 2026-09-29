import Sale from "../models/sale.model.js";
import SaleItem from "../models/sale_item.model.js";
import Company from "../models/company.model.js";
import { getNextInvoiceNumber } from "../services/sale.service.js";
import Customer from "../models/customer.model.js";
import CustomerLedger from "../models/customer_ledger.model.js";

export const createSale = async (req, res) => {
  try {
    const companyId = req.user.company_id;

    const {
      source,
      sale_mode,
      customer_id,
      items,
      discount_amount = 0,
    } = req.body;

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

if (customer_id) {
  const customer = await Customer.findOne({
    _id: customer_id,
    company_id: companyId,
    is_active: true,
  });

  if (!customer) {
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

      // PRODUCT sale
      if (sale_mode === "PRODUCT") {
        if (!item.product_id) {
          return res.status(400).json({
            success: false,
            message: "product_id is required for PRODUCT sale",
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
        product_name: item.product_name || "",
        description: item.description || "",
        qty,
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
    // 8. GENERATE INVOICE NUMBER
    // --------------------------------

    const invoiceNo = await getNextInvoiceNumber(companyId);

    // --------------------------------
    // 9. CREATE SALE
    // --------------------------------

    const sale = await Sale.create({
      company_id: companyId,
      customer_id: customer_id || null,

      source,
      sale_mode,

      invoice_no: invoiceNo,
      invoice_date: new Date(),

      subtotal,
      discount_amount: discount,
      total_amount: totalAmount,

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
        source: sale.source,
        sale_mode: sale.sale_mode,
        customer_id: sale.customer_id,

        subtotal: sale.subtotal,
        discount_amount: sale.discount_amount,
        total_amount: sale.total_amount,
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
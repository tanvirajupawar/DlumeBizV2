import mongoose from "mongoose";

const saleSchema = new mongoose.Schema(
  {
    // ============================================
    // COMPANY
    // ============================================

    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    // ============================================
    // CUSTOMER
    // ============================================

    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
      index: true,
    },

    // ============================================
    // SALE SOURCE
    // ============================================

    source: {
      type: String,
      enum: ["POS", "MOBILE"],
      required: true,
    },

    // ============================================
    // SALE MODE
    // ============================================

    sale_mode: {
      type: String,
      enum: ["PRODUCT", "CALCULATOR"],
      required: true,
    },

    // ============================================
    // INVOICE
    // ============================================

    invoice_no: {
      type: String,
      required: true,
      trim: true,
    },

    invoice_date: {
      type: Date,
      default: Date.now,
      index: true,
    },

    due_date: {
      type: Date,
      default: null,
    },

    // ============================================
    // AMOUNTS
    // ============================================

    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    discount_amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    total_amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ============================================
    // CREATED BY
    // ============================================

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

// Invoice number unique inside a company
saleSchema.index(
  {
    company_id: 1,
    invoice_no: 1,
  },
  {
    unique: true,
  }
);

// Customer's sales
saleSchema.index({
  company_id: 1,
  customer_id: 1,
});

// Customer's sales ordered by date
saleSchema.index({
  company_id: 1,
  customer_id: 1,
  invoice_date: 1,
});

// Company sales by date
saleSchema.index({
  company_id: 1,
  invoice_date: 1,
});

// Sale mode reporting
saleSchema.index({
  company_id: 1,
  sale_mode: 1,
});

// POS / Mobile reporting
saleSchema.index({
  company_id: 1,
  source: 1,
});

const Sale = mongoose.model("Sale", saleSchema);

export default Sale;
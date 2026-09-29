import mongoose from "mongoose";

const saleItemSchema = new mongoose.Schema(
  {
    sale_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
      required: true,
    },

    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    // PRODUCT sale → actual product ID
    // CALCULATOR sale → null
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },

    // Snapshot of the product/item name at the time of sale
    product_name: {
      type: String,
      default: "",
      trim: true,
    },

    // Used especially for calculator/manual items
    description: {
      type: String,
      default: "",
      trim: true,
    },

    qty: {
      type: Number,
      required: true,
      min: 0,
    },

    rate: {
      type: Number,
      required: true,
      min: 0,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Useful later for GST/product billing
    unit: {
      type: String,
      default: "",
      trim: true,
    },

    hsn: {
      type: String,
      default: "",
      trim: true,
    },

    gst_rate: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

saleItemSchema.index({ sale_id: 1 });
saleItemSchema.index({ company_id: 1 });
saleItemSchema.index({ product_id: 1 });

const SaleItem = mongoose.model("SaleItem", saleItemSchema);

export default SaleItem;
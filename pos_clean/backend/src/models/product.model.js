
import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    product: {
      type: String,
      required: true,
      trim: true,
    },

    barcode: {
      type: String,
      trim: true,
      default: undefined,
    },

    image: {
      type: String,
      default: "",
    },

    barcode_qty: {
      type: Number,
      default: 1,
    },

    type: {
      type: String,
      default: "",
    },

    hsn: {
      type: String,
      default: "",
    },

    size: {
      type: String,
      default: "",
    },

    qty: {
      type: Number,
      default: 0,
    },

    purchase_price: {
      type: Number,
      default: 0,
    },

    mrp: {
      type: Number,
      default: 0,
    },

    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    category: {
      type: String,
      default: "",
    },

    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    code: {
      type: String,
      default: "",
    },

    unit: {
      type: String,
      default: "PCS",
    },

    is_active: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: String,
      default: "",
    },

    updatedBy: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Keep barcodes unique when provided, within a company.
productSchema.index(
  { company_id: 1, barcode: 1 },
  {
    unique: true,
    partialFilterExpression: {
      barcode: { $type: "string" },
    },
  }
);

productSchema.index({ company_id: 1, product: 1 });
productSchema.index({ company_id: 1, category_id: 1 });

const Product = mongoose.model("Product", productSchema);

export default Product;

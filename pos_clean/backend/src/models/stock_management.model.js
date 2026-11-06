
import mongoose from "mongoose";

const stockManagementSchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    in: {
      type: Number,
      default: 0,
      min: 0,
    },

    out: {
      type: Number,
      default: 0,
      min: 0,
    },

    total_stock: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// One stock record per product per company.
stockManagementSchema.index(
  { company_id: 1, product_id: 1 },
  { unique: true }
);

// Automatically calculate total stock before saving.
stockManagementSchema.pre("save", function () {
  this.total_stock =
    Number(this.in || 0) - Number(this.out || 0);
});

const StockManagement = mongoose.model(
  "StockManagement",
  stockManagementSchema,
  "stockmanagements"
);

export default StockManagement;


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

// Calculate total stock before saving.
stockManagementSchema.pre("save", function () {
  this.total_stock = (this.in || 0) - (this.out || 0);
});

// Calculate total stock when both values are provided
// in a findOneAndUpdate operation.
stockManagementSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate() || {};
  const values = {
    ...(update.$set || {}),
    ...Object.fromEntries(
      Object.entries(update).filter(([key]) => !key.startsWith("$"))
    ),
  };

  if (values.in !== undefined || values.out !== undefined) {
    const currentIn = values.in ?? 0;
    const currentOut = values.out ?? 0;

    update.$set = {
      ...(update.$set || {}),
      total_stock: currentIn - currentOut,
      updatedAt: new Date(),
    };

    this.setUpdate(update);
  }
});

const StockManagement = mongoose.model(
  "StockManagement",
  stockManagementSchema,
  "stockmanagements"
);

export default StockManagement;

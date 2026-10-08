import mongoose from "mongoose";

const saleCounterSchema = new mongoose.Schema(
  {
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      unique: true,
    },

    next_number: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

const SaleCounter = mongoose.model("SaleCounter", saleCounterSchema);

export default SaleCounter;
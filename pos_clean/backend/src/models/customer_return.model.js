
import mongoose from "mongoose";

const customerReturnSchema = new mongoose.Schema(
  {
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },

    return_no: {
      type: String,
      required: true,
      trim: true,
    },

    return_date: {
      type: Date,
      default: Date.now,
      index: true,
    },

    return_mode: {
      type: String,
      enum: ["CALCULATOR"],
      default: "CALCULATOR",
      required: true,
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    total_amount: {
      type: Number,
      required: true,
      min: 0,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

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

customerReturnSchema.index(
  {
    company_id: 1,
    return_no: 1,
  },
  {
    unique: true,
  }
);

customerReturnSchema.index({
  company_id: 1,
  customer_id: 1,
  return_date: 1,
});

const CustomerReturn = mongoose.model(
  "CustomerReturn",
  customerReturnSchema
);

export default CustomerReturn;

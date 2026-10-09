
import mongoose from "mongoose";

const customerReturnItemSchema = new mongoose.Schema(
  {
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    return_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerReturn",
      required: true,
      index: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    qty: {
      type: Number,
      required: true,
      min: 0.001,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

customerReturnItemSchema.index({
  company_id: 1,
  return_id: 1,
});

const CustomerReturnItem = mongoose.model(
  "CustomerReturnItem",
  customerReturnItemSchema
);

export default CustomerReturnItem;

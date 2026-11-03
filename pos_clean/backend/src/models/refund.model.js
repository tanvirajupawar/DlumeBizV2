
import mongoose from "mongoose";

const refundSchema = new mongoose.Schema(
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

    // Original payment from which excess money is refunded
    payment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
    },

    // Invoice edit that caused the excess payment
    sale_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    refund_method: {
      type: String,
      enum: ["CASH", "CARD", "UPI", "OTHER"],
      required: true,
    },

    refund_date: {
      type: Date,
      default: Date.now,
    },

    reference_no: {
      type: String,
      default: "",
      trim: true,
    },

    remarks: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["COMPLETED", "PENDING", "FAILED"],
      default: "COMPLETED",
    },

    refunded_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

refundSchema.index({ company_id: 1, customer_id: 1, refund_date: 1 });
refundSchema.index({ company_id: 1, payment_id: 1 });
refundSchema.index({ company_id: 1, sale_id: 1 });

const Refund = mongoose.model("Refund", refundSchema);

export default Refund;


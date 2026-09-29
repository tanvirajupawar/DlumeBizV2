import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    payment_method: {
      type: String,
      enum: ["CASH", "CARD", "UPI", "OTHER"],
      required: true,
    },

    payment_date: {
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

    received_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

paymentSchema.index({ company_id: 1 });
paymentSchema.index({ company_id: 1, customer_id: 1 });
paymentSchema.index({ company_id: 1, payment_date: 1 });

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
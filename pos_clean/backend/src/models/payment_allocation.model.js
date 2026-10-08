import mongoose from "mongoose";

const paymentAllocationSchema = new mongoose.Schema(
  {
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    payment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
    },

    sale_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true }
);

paymentAllocationSchema.index({ company_id: 1 });
paymentAllocationSchema.index({ company_id: 1, payment_id: 1 });
paymentAllocationSchema.index({ company_id: 1, sale_id: 1 });

const PaymentAllocation = mongoose.model(
  "PaymentAllocation",
  paymentAllocationSchema
);

export default PaymentAllocation;
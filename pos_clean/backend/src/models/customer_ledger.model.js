import mongoose from "mongoose";

const customerLedgerSchema = new mongoose.Schema(
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

 
    // SALE = customer owes money
    // PAYMENT = customer paid money
    // RETURN = returned goods reduce customer outstanding
    type: {
      type: String,
      enum: ["SALE", "PAYMENT", "RETURN"],
      required: true,
    },


    // For SALE entries
    sale_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
      default: null,
    },

    // For PAYMENT entries
    payment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },

    // Amount added to customer's outstanding
    debit: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Amount reducing customer's outstanding
    credit: {
      type: Number,
      default: 0,
      min: 0,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    transaction_date: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

customerLedgerSchema.index({
  company_id: 1,
  customer_id: 1,
  transaction_date: 1,
});

customerLedgerSchema.index({
  company_id: 1,
  customer_id: 1,
  type: 1,
});

const CustomerLedger = mongoose.model(
  "CustomerLedger",
  customerLedgerSchema
);

export default CustomerLedger;
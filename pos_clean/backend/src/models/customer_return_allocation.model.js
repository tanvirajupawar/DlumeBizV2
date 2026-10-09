
import mongoose from "mongoose";

const customerReturnAllocationSchema = new mongoose.Schema(
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
    },

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
  },
  { timestamps: true }
);

customerReturnAllocationSchema.index({
  company_id: 1,
  return_id: 1,
});

customerReturnAllocationSchema.index({
  company_id: 1,
  sale_id: 1,
});

customerReturnAllocationSchema.index(
  { return_id: 1, sale_id: 1 },
  { unique: true }
);

const CustomerReturnAllocation = mongoose.model(
  "CustomerReturnAllocation",
  customerReturnAllocationSchema
);

export default CustomerReturnAllocation;

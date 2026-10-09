
import mongoose from "mongoose";

const customerReturnCounterSchema = new mongoose.Schema(
  {
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      unique: true,
    },

  next_number: {
  type: Number,
  default: 0,
  min: 0,
},
  },
  {
    timestamps: true,
  }
);

const CustomerReturnCounter = mongoose.model(
  "CustomerReturnCounter",
  customerReturnCounterSchema
);

export default CustomerReturnCounter;

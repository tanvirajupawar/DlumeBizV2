
import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      trim: true,
    },
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: String,
      default: "",
    },
    updatedBy: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

categorySchema.index(
  { company_id: 1, category: 1 },
  { unique: true }
);

const Category = mongoose.model("Category", categorySchema);

export default Category;

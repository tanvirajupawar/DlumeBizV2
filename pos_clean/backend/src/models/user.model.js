import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    phoneNumber: {
      type: String,
      default: "",
      trim: true,
    },

    address: {
      type: String,
      default: "",
      trim: true,
    },

    city: {
      type: String,
      default: "",
      trim: true,
    },

    state: {
      type: String,
      default: "",
      trim: true,
    },

    role: {
      type: String,
      enum: ["ADMIN", "MANAGER"],
      default: "ADMIN",
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// One email cannot be duplicated within the same company.
userSchema.index(
  { company_id: 1, email: 1 },
  { unique: true }
);

// One mobile number cannot be duplicated within the same company.
userSchema.index(
  { company_id: 1, phoneNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      phoneNumber: { $type: "string", $ne: "" },
    },
  }
);

userSchema.index({ company_id: 1 });
userSchema.index({ company_id: 1, role: 1 });

const User = mongoose.model("User", userSchema);

export default User;
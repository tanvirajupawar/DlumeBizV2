import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    // ============================================
    // COMPANY / TENANT
    // ============================================

 company_id: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Company",
  required: true,
},

    // ============================================
    // CUSTOMER NAME
    // ============================================

    first_name: {
      type: String,
      default: "",
      trim: true,
    },

    last_name: {
      type: String,
      default: "",
      trim: true,
    },

    customer_name: {
      type: String,
      default: "",
      trim: true,
    },

    // ============================================
    // BUSINESS INFORMATION
    // ============================================

    company_name: {
      type: String,
      default: "",
      trim: true,
    },

    customer_type: {
      type: String,
      default: "",
      trim: true,
    },

    business_type: {
      type: String,
      default: "",
      trim: true,
    },

    // ============================================
    // TAX / IDENTITY INFORMATION
    // ============================================

    gstin: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },

    pan_number: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },

    // ============================================
    // CONTACT
    // ============================================

    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    website: {
      type: String,
      default: "",
      trim: true,
    },

    contact_no_1: {
      type: String,
      default: "",
      trim: true,
    },

    contact_no_2: {
      type: String,
      default: "",
      trim: true,
    },

    // ============================================
    // BILLING ADDRESS
    // ============================================

    address_line_1: {
      type: String,
      default: "",
      trim: true,
    },

    address_line_2: {
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

    country: {
      type: String,
      default: "India",
      trim: true,
    },

    pincode: {
      type: String,
      default: "",
      trim: true,
    },

 

    // ============================================
    // OPENING BALANCE
    // ============================================

    opening_balance: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ============================================
    // STATUS
    // ============================================

    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

customerSchema.index({
  company_id: 1,
});

customerSchema.index({
  company_id: 1,
  first_name: 1,
});

customerSchema.index({
  company_id: 1,
  last_name: 1,
});

customerSchema.index({
  company_id: 1,
  company_name: 1,
});

customerSchema.index({
  company_id: 1,
  gstin: 1,
});

customerSchema.index({
  company_id: 1,
  contact_no_1: 1,
});

// ============================================
// CUSTOMER NAME
// ============================================

customerSchema.pre("save", function () {
  this.customer_name = `${this.first_name || ""} ${
    this.last_name || ""
  }`.trim();
});

customerSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate() || {};

  const firstName =
    update.first_name ??
    update.$set?.first_name;

  const lastName =
    update.last_name ??
    update.$set?.last_name;

  if (firstName !== undefined || lastName !== undefined) {
    if (!update.$set) {
      update.$set = {};
    }

    update.$set.customer_name = `${firstName || ""} ${
      lastName || ""
    }`.trim();
  }

  this.setUpdate(update);

  next();
});

const Customer = mongoose.model("Customer", customerSchema);

export default Customer;
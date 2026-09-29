import mongoose from "mongoose";



const companySchema = new mongoose.Schema(
  {
    // =========================
    // BASIC COMPANY INFORMATION
    // =========================

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    mobile: {
      type: String,
      required: true,
      trim: true,
    },

    alt_mobile: {
      type: String,
      default: "",
      trim: true,
    },

    // =========================
    // OWNER INFORMATION
    // =========================

    owner_name: {
      type: String,
      default: "",
      trim: true,
    },

    owner_mobile: {
      type: String,
      default: "",
      trim: true,
    },

    owner_email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    // =========================
    // ADDRESS
    // =========================

    address: {
      type: String,
      default: "",
      trim: true,
    },

    area: {
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

    // =========================
    // BUSINESS / TAX INFORMATION
    // =========================

    gst: {
      type: String,
      default: "",
      trim: true,
    },

    pan: {
      type: String,
      default: "",
      trim: true,
    },

   

    // =========================
    // BRANDING
    // =========================

    logo: {
      type: String,
      default: "",
    },

    logo_name: {
      type: String,
      default: "",
    },

    letter_name: {
      type: String,
      default: "",
    },

    letter_head: {
      type: String,
      default: "",
    },

    // =========================
    // SUBSCRIPTION
    // =========================

    subscription_status: {
      type: String,
      enum: ["TRIAL", "ACTIVE", "EXPIRED"],
      default: "TRIAL",
    },

    subscription_expiry: {
      type: Date,
    },

    plan_duration_months: {
      type: Number,
      default: 1,
      min: 1,
    },

    // =========================
    // FEATURES
    // =========================

    features: {
      payment_gateway: {
        type: Boolean,
        default: false,
      },
    },

    // =========================
    // POS CONFIGURATION
    // =========================

    pos_mode: {
      type: String,
      enum: ["PRODUCT", "CALCULATOR"],
      default: "PRODUCT",
    },

    payment_mode: {
      type: String,
      enum: ["CREDIT", "NON_CREDIT"],
      default: "NON_CREDIT",
    },

    // =========================
    // PRINTER SETTINGS
    // =========================

    receipt_size: {
      type: String,
      enum: ["58mm", "80mm", "A4"],
      default: "58mm",
    },

    barcode_label_size: {
      type: String,
      enum: ["2x1", "3x2", "4x2"],
      default: "2x1",
    },
  },
  {
    timestamps: true,
  }
);

// =========================
// INDEXES
// =========================

companySchema.index({ mobile: 1 });
companySchema.index({ subscription_status: 1 });
companySchema.index({ subscription_expiry: 1 });

console.log("🔥 COMPANY MODEL PATH:", import.meta.url);

console.log(
  "🔥 COMPANY SCHEMA PATHS:",
  Object.keys(companySchema.paths)
);

console.log(
  "🔥 FEATURES SCHEMA:",
  companySchema.path("features")?.schema?.paths
);

const Company = mongoose.model("Company", companySchema);

export default Company;
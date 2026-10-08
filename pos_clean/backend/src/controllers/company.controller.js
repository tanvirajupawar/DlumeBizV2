import Company from "../models/company.model.js";

export const createCompany = async (req, res) => {
  try {
    const {
      name,
      email,
      mobile,
      pos_mode,
      payment_mode,
      plan_duration_months,
    } = req.body;

    // =========================
    // REQUIRED FIELDS
    // =========================

    if (!name || !email || !mobile) {
      return res.status(400).json({
        success: false,
        message: "Name, email and mobile are required",
      });
    }

    // =========================
    // SUBSCRIPTION DURATION
    // =========================

    const allowedDurations = [1, 3, 6, 12];

    const duration = Number(plan_duration_months);

    if (!allowedDurations.includes(duration)) {
      return res.status(400).json({
        success: false,
        message: "Subscription duration must be 1, 3, 6 or 12 months",
      });
    }

    // =========================
    // CHECK COMPANY EMAIL
    // =========================

    const existingCompany = await Company.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existingCompany) {
      return res.status(409).json({
        success: false,
        message: "Company with this email already exists",
      });
    }

    // =========================
    // CALCULATE EXPIRY
    // =========================

    const subscriptionExpiry = new Date();

    subscriptionExpiry.setMonth(
      subscriptionExpiry.getMonth() + duration
    );

    // =========================
    // CREATE COMPANY
    // =========================

    const company = await Company.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      mobile: mobile.trim(),

      pos_mode: pos_mode || "PRODUCT",
      payment_mode: payment_mode || "NON_CREDIT",

      plan_duration_months: duration,
      subscription_status: "ACTIVE",
      subscription_expiry: subscriptionExpiry,
    });

    return res.status(201).json({
      success: true,
      message: "Company created successfully",
      data: company,
    });
  } catch (error) {
    console.error("Create company error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create company",
      error: error.message,
    });
  }
};


export const getMyCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.user.company_id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Company fetched successfully",
      data: company,
    });
  } catch (error) {
    console.error("Get company error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch company",
      error: error.message,
    });
  }
};


export const updateMyCompany = async (req, res) => {
  try {
    const {
      name,
      email,
      mobile,
      alt_mobile,
      owner_name,
      owner_mobile,
      owner_email,
      address,
      area,
      city,
      state,
      country,
      pincode,
      gst,
      pan,
      logo,
      logo_name,
      letter_name,
      letter_head,
      pos_mode,
      payment_mode,
      receipt_size,
      barcode_label_size,
    } = req.body;

    const company = await Company.findById(req.user.company_id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    // =========================
    // UPDATE BASIC INFORMATION
    // =========================

    if (name !== undefined) company.name = name.trim();

    if (email !== undefined) {
      company.email = email.toLowerCase().trim();
    }

    if (mobile !== undefined) company.mobile = mobile.trim();

    if (alt_mobile !== undefined) company.alt_mobile = alt_mobile.trim();

    // =========================
    // OWNER INFORMATION
    // =========================

    if (owner_name !== undefined) {
      company.owner_name = owner_name.trim();
    }

    if (owner_mobile !== undefined) {
      company.owner_mobile = owner_mobile.trim();
    }

    if (owner_email !== undefined) {
      company.owner_email = owner_email.toLowerCase().trim();
    }

    // =========================
    // ADDRESS
    // =========================

    if (address !== undefined) company.address = address.trim();
    if (area !== undefined) company.area = area.trim();
    if (city !== undefined) company.city = city.trim();
    if (state !== undefined) company.state = state.trim();
    if (country !== undefined) company.country = country.trim();
    if (pincode !== undefined) company.pincode = pincode.trim();

    // =========================
    // BUSINESS / TAX
    // =========================

    if (gst !== undefined) company.gst = gst.trim();
    if (pan !== undefined) company.pan = pan.trim();

    // =========================
    // BRANDING
    // =========================

    if (logo !== undefined) company.logo = logo;
    if (logo_name !== undefined) company.logo_name = logo_name;
    if (letter_name !== undefined) company.letter_name = letter_name;
    if (letter_head !== undefined) company.letter_head = letter_head;

    // =========================
    // POS CONFIGURATION
    // =========================

    if (pos_mode !== undefined) company.pos_mode = pos_mode;

    if (payment_mode !== undefined) {
      company.payment_mode = payment_mode;
    }

    // =========================
    // PRINTER SETTINGS
    // =========================

    if (receipt_size !== undefined) {
      company.receipt_size = receipt_size;
    }

    if (barcode_label_size !== undefined) {
      company.barcode_label_size = barcode_label_size;
    }

    await company.save();

    return res.status(200).json({
      success: true,
      message: "Company updated successfully",
      data: company,
    });
  } catch (error) {
    console.error("Update company error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update company",
      error: error.message,
    });
  }
};
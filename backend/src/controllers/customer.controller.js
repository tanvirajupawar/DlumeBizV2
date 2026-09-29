import Customer from "../models/customer.model.js";

export const createCustomer = async (req, res) => {
  try {
    const companyId = req.user.company_id;

    const {
      first_name,
      last_name,
      company_name,
      customer_type,
      business_type,
      gstin,
      pan_number,
      email,
      website,
      contact_no_1,
      contact_no_2,
      address_line_1,
      address_line_2,
      city,
      state,
      country,
      pincode,
      opening_balance,
    } = req.body;

    // ============================================
    // 1. BASIC VALIDATION
    // ============================================

    if (!first_name || !String(first_name).trim()) {
      return res.status(400).json({
        success: false,
        message: "First name is required",
      });
    }

    // ============================================
    // 2. NORMALIZE DATA
    // ============================================

    const normalizedFirstName = String(first_name).trim();
    const normalizedLastName = String(last_name || "").trim();

    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();

    const normalizedGstin = String(gstin || "")
      .trim()
      .toUpperCase();

    const normalizedPan = String(pan_number || "")
      .trim()
      .toUpperCase();

    const normalizedContact1 = String(contact_no_1 || "").trim();
    const normalizedContact2 = String(contact_no_2 || "").trim();

    const openingBalance = Number(opening_balance || 0);

    // ============================================
    // 3. OPENING BALANCE VALIDATION
    // ============================================

    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid opening balance",
      });
    }

    // ============================================
    // 4. DUPLICATE CONTACT CHECK
    // ============================================

    if (normalizedContact1) {
      const existingCustomer = await Customer.findOne({
        company_id: companyId,
        contact_no_1: normalizedContact1,
      });

      if (existingCustomer) {
        return res.status(409).json({
          success: false,
          message: "Customer with this contact number already exists",
        });
      }
    }

    // ============================================
    // 5. CREATE CUSTOMER
    // ============================================

    const customer = await Customer.create({
      company_id: companyId,

      first_name: normalizedFirstName,
      last_name: normalizedLastName,

      company_name: String(company_name || "").trim(),
      customer_type: String(customer_type || "").trim(),
      business_type: String(business_type || "").trim(),

      gstin: normalizedGstin,
      pan_number: normalizedPan,

      email: normalizedEmail,
      website: String(website || "").trim(),

      contact_no_1: normalizedContact1,
      contact_no_2: normalizedContact2,

      address_line_1: String(address_line_1 || "").trim(),
      address_line_2: String(address_line_2 || "").trim(),

      city: String(city || "").trim(),
      state: String(state || "").trim(),
      country: String(country || "India").trim(),
      pincode: String(pincode || "").trim(),

      opening_balance: openingBalance,
    });

    // ============================================
    // 6. RESPONSE
    // ============================================

    return res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: customer,
    });
  } catch (error) {
    console.error("Create customer error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create customer",
      error: error.message,
    });
  }
};

export const getCustomers = async (req, res) => {
  try {
    const companyId = req.user.company_id;

    const customers = await Customer.find({
      company_id: companyId,
      is_active: true,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Customers fetched successfully",
      data: customers,
    });
  } catch (error) {
    console.error("Get customers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
      error: error.message,
    });
  }
};
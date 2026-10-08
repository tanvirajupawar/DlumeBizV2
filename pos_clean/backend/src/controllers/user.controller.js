import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import Company from "../models/company.model.js";

export const createUser = async (req, res) => {
  try {
 const {
  name,
  email,
  password,
  phoneNumber,
  address,
  city,
  state,
  role,
} = req.body;

const company_id = req.user.company_id;

    // =========================
    // REQUIRED FIELDS
    // =========================

    if (!company_id || !name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Company, name, email and password are required",
      });
    }

    // =========================
    // CHECK COMPANY
    // =========================

    const company = await Company.findById(company_id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    // =========================
    // CHECK EMAIL IN COMPANY
    // =========================

    const existingUser = await User.findOne({
      company_id,
      email: email.toLowerCase().trim(),
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists in this company",
      });
    }

    // =========================
    // PASSWORD HASH
    // =========================

    const hashedPassword = await bcrypt.hash(password, 12);

    // =========================
    // CREATE USER
    // =========================

    const user = await User.create({
      company_id,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phoneNumber: phoneNumber || "",
      address: address || "",
      city: city || "",
      state: state || "",
      role: role || "ADMIN",
      active: true,
    });

    // =========================
    // REMOVE PASSWORD
    // =========================

    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: userResponse,
    });
  } catch (error) {
    console.error("Create user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create user",
      error: error.message,
    });
  }
};
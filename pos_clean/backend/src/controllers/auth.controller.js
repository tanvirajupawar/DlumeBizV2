import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import Company from "../models/company.model.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/auth.js";

export const login = async (req, res) => {
  try {
    const { login, password } = req.body;

    // =========================
    // REQUIRED FIELDS
    // =========================

    if (!login || !password) {
      return res.status(400).json({
        success: false,
        message: "Email/mobile and password are required",
      });
    }

    const loginValue = login.trim();

    // =========================
    // FIND USER
    // =========================

    const user = await User.findOne({
      $or: [
        {
          email: loginValue.toLowerCase(),
        },
        {
          phoneNumber: loginValue,
        },
      ],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email/mobile or password",
      });
    }

    // =========================
    // CHECK ACTIVE
    // =========================

    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: "User account is inactive",
      });
    }

    // =========================
    // CHECK PASSWORD
    // =========================

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email/mobile or password",
      });
    }

    // =========================
    // GENERATE TOKENS
    // =========================

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // =========================
    // STORE REFRESH TOKEN IN COOKIE
    // =========================

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    // =========================
    // REMOVE PASSWORD
    // =========================

const company = await Company.findById(user.company_id);

if (!company) {
  return res.status(404).json({
    success: false,
    message: "Company not found",
  });
}

const userResponse = user.toObject();

delete userResponse.password;

userResponse.company = company.toObject();

    // =========================
    // RESPONSE
    // =========================

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: userResponse,
        accessToken,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
};



export const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    // =========================
    // CHECK REFRESH TOKEN
    // =========================

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token not found",
      });
    }

    // =========================
    // VERIFY REFRESH TOKEN
    // =========================

    const decoded = verifyRefreshToken(refreshToken);

    // =========================
    // FIND USER
    // =========================

    const user = await User.findOne({
  _id: decoded.user_id,
  company_id: decoded.company_id,
});

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // =========================
    // CHECK ACTIVE
    // =========================

    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: "User account is inactive",
      });
    }

    // =========================
    // GENERATE NEW ACCESS TOKEN
    // =========================

    const accessToken = generateAccessToken(user);

    return res.status(200).json({
      success: true,
      message: "Access token refreshed",
      data: {
        accessToken,
      },
    });
  } catch (error) {
    console.error("Refresh token error:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token",
    });
  }
};



export const logout = async (req, res) => {
  try {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);

    return res.status(500).json({
      success: false,
      message: "Logout failed",
      error: error.message,
    });
  }
};
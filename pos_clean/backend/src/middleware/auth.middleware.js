import User from "../models/user.model.js";
import { verifyAccessToken } from "../utils/auth.js";

export const authenticate = async (req, res, next) => {
  try {
    // =========================
    // GET AUTHORIZATION HEADER
    // =========================

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Access token required",
      });
    }

    // =========================
    // CHECK BEARER FORMAT
    // =========================

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format",
      });
    }

    const token = authHeader.split(" ")[1];

    // =========================
    // VERIFY TOKEN
    // =========================

    const decoded = verifyAccessToken(token);

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
    // ATTACH USER TO REQUEST
    // =========================

    req.user = user;

    next();
  } catch (error) {
    console.error("Authentication error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token",
    });
  }
};
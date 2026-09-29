import jwt from "jsonwebtoken";

// =========================
// ACCESS TOKEN
// =========================

export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      user_id: user._id,
      company_id: user.company_id,
      role: user.role,
    },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: "15m",
    }
  );
};

// =========================
// REFRESH TOKEN
// =========================

export const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      user_id: user._id,
      company_id: user.company_id,
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: "30d",
    }
  );
};

// =========================
// VERIFY ACCESS TOKEN
// =========================

export const verifyAccessToken = (token) => {
  return jwt.verify(
    token,
    process.env.JWT_ACCESS_SECRET
  );
};

// =========================
// VERIFY REFRESH TOKEN
// =========================

export const verifyRefreshToken = (token) => {
  return jwt.verify(
    token,
    process.env.JWT_REFRESH_SECRET
  );
};
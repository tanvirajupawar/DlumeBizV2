
import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  createProduct,
  fetchProducts,
  fetchProduct,
  fetchByCategory,
  deleteProduct,
  updateProduct,
  addStock,
  toggleStatus,
} from "../controllers/product.controller.js";

const router = express.Router();

// Create product
router.post("/", authenticate, createProduct);

// Fetch all products
router.get("/", authenticate, fetchProducts);

// Fetch products by category
router.get("/category/:id", authenticate, fetchByCategory);

// Add stock
router.put("/add-stock/:id", authenticate, addStock);

// Toggle active status
router.patch("/:id/status", authenticate, toggleStatus);

// Fetch one product
router.get("/:id", authenticate, fetchProduct);

// Update product
router.put("/:id", authenticate, updateProduct);

// Delete product
router.delete("/:id", authenticate, deleteProduct);

export default router;

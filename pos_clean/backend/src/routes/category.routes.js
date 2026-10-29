
import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  createCategory,
  fetchCategories,
  fetchCategory,
  updateCategory,
  deleteCategory,
  toggleStatus,
} from "../controllers/category.controller.js";

const router = express.Router();

router.post("/", authenticate, createCategory);
router.get("/", authenticate, fetchCategories);
router.patch("/:id/status", authenticate, toggleStatus);
router.get("/:id", authenticate, fetchCategory);
router.put("/:id", authenticate, updateCategory);
router.delete("/:id", authenticate, deleteCategory);

export default router;

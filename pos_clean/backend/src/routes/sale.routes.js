
import { Router } from "express";

import {
  createSale,
  getSales,
  updateSale,
  deleteSale,
} from "../controllers/sale.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", authenticate, createSale);
router.get("/", authenticate, getSales);

// Update an invoice
router.put("/:id", authenticate, updateSale);

// Delete an invoice
router.delete("/:id", authenticate, deleteSale);

export default router;


import { Router } from "express";

import {
  createSale,
  getSales,
  deleteSale,
} from "../controllers/sale.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", authenticate, createSale);
router.get("/", authenticate, getSales);

// Delete an invoice
router.delete("/:id", authenticate, deleteSale);

export default router;

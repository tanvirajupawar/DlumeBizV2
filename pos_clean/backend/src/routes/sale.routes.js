import { Router } from "express";

import {
  createSale,
  getSales,
} from "../controllers/sale.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", authenticate, createSale);
router.get("/", authenticate, getSales);

export default router;
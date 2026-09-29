import { Router } from "express";

import {
  createPayment,
  getPayments,
} from "../controllers/payment.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", authenticate, createPayment);
router.get("/", authenticate, getPayments);

export default router;
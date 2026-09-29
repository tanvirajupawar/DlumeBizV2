import { Router } from "express";
import { createPayment } from "../controllers/payment.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", authenticate, createPayment);

export default router;
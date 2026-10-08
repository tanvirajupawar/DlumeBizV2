import { Router } from "express";
import { getCustomerLedger } from "../controllers/customer_ledger.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/:id", authenticate, getCustomerLedger);

export default router;
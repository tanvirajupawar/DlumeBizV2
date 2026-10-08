import { Router } from "express";
import { getCustomerAccount } from "../controllers/customer_account.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/:id", authenticate, getCustomerAccount);

export default router;
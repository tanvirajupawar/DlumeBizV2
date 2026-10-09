import { Router } from "express";

import {
  createCustomerReturn,
  getCustomerReturns,
} from "../controllers/customer_return.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", authenticate, getCustomerReturns);

router.post("/", authenticate, createCustomerReturn);

export default router;
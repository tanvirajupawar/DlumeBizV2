import { Router } from "express";

import {
  createCustomer,
  getCustomers,
} from "../controllers/customer.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", authenticate, getCustomers);

router.post("/", authenticate, createCustomer);

export default router;
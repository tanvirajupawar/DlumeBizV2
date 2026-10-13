import { Router } from "express";

import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
} from "../controllers/customer.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", authenticate, getCustomers);

router.get("/:id", authenticate, getCustomerById);

router.post("/", authenticate, createCustomer);

router.put("/:id", authenticate, updateCustomer);

export default router;
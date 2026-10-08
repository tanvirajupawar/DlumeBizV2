import { Router } from "express";

import {
  getInvoiceById,
  getInvoices,
  getCustomerInvoices,
  getCreditSummary,
} from "../controllers/invoice.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", authenticate, getInvoices);

router.get(
  "/credit-summary/customer/:customerId",
  authenticate,
  getCreditSummary
);

router.get(
  "/customer/:customerId",
  authenticate,
  getCustomerInvoices
);

router.get("/:id", authenticate, getInvoiceById);

export default router;
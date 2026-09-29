import { Router } from "express";
import {
  createCompany,
  getMyCompany,
  updateMyCompany,
} from "../controllers/company.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = Router();

router.post("/", createCompany);

router.get(
  "/me",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  getMyCompany
);

router.put(
  "/me",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  updateMyCompany
);

export default router;
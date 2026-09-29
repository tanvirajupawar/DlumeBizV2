import express from "express";
import cookieParser from "cookie-parser";
import companyRoutes from "./routes/company.routes.js";
import userRoutes from "./routes/user.routes.js";
import authRoutes from "./routes/auth.routes.js";
import saleRoutes from "./routes/sale.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import invoiceRoutes from "./routes/invoice.routes.js";
import customerAccountRoutes from "./routes/customer_account.routes.js";
import customerLedgerRoutes from "./routes/customer_ledger.routes.js";


const app = express();
console.log("🔥🔥🔥 V2 APP.JS LOADED 🔥🔥🔥");
app.use(express.json());
app.use(cookieParser());

// =========================
// ROUTES
// =========================

app.use("/api/companies", companyRoutes);
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/customer-accounts", customerAccountRoutes);
app.use("/api/customer-ledger", customerLedgerRoutes);



app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "D'Lume Biz API is running",
  });
});

export default app;
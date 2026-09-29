import Customer from "../models/customer.model.js";
import Sale from "../models/sale.model.js";
import PaymentAllocation from "../models/payment_allocation.model.js";

export const getCustomerAccount = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { id } = req.params;

    // --------------------------------
    // 1. FIND CUSTOMER
    // --------------------------------

    const customer = await Customer.findOne({
      _id: id,
      company_id: companyId,
      is_active: true,
    }).lean();

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // --------------------------------
    // 2. GET CUSTOMER SALES
    // --------------------------------

    const sales = await Sale.find({
      company_id: companyId,
      customer_id: customer._id,
    })
      .sort({ invoice_date: 1 })
      .lean();

    // --------------------------------
    // 3. GET PAYMENT ALLOCATIONS
    // --------------------------------

    const allocations = await PaymentAllocation.find({
      company_id: companyId,
    }).lean();

    // --------------------------------
    // 4. CALCULATE SALES
    // --------------------------------

    const totalSales = sales.reduce(
      (total, sale) => total + Number(sale.total_amount || 0),
      0
    );

    // --------------------------------
    // 5. CALCULATE ALLOCATED PAYMENTS
    // --------------------------------

    const customerSaleIds = new Set(
      sales.map((sale) => sale._id.toString())
    );

    const customerAllocations = allocations.filter((allocation) =>
      customerSaleIds.has(allocation.sale_id.toString())
    );

    const totalPayments = customerAllocations.reduce(
      (total, allocation) => total + Number(allocation.amount || 0),
      0
    );

    // --------------------------------
    // 6. CALCULATE OUTSTANDING
    // --------------------------------

    const openingBalance = Number(customer.opening_balance || 0);

    const outstanding =
      openingBalance + totalSales - totalPayments;

    // --------------------------------
    // 7. RESPONSE
    // --------------------------------

    return res.status(200).json({
      success: true,
      message: "Customer account fetched successfully",

      data: {
        customer: {
          _id: customer._id,
          first_name: customer.first_name,
          last_name: customer.last_name,
          customer_name: customer.customer_name,
        },

        summary: {
          opening_balance: openingBalance,
          total_sales: totalSales,
          total_payments: totalPayments,
          outstanding,
        },
      },
    });
  } catch (error) {
    console.error("Get customer account error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer account",
      error: error.message,
    });
  }
};
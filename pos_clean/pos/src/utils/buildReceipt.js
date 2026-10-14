export const buildReceipt = ({
  company,
  user,
  customer,
  sale,
  cartItems,
  paymentMode, // "Cash" | "UPI" | "Card" | "Credit"
  transportationDetails,
  subtotal,
  discountValue,
  tax,
  invoiceAmount,
  previousOutstanding,
  totalPayable,
  amountPaid,
}) => ({
  companyName: company?.name || "D'LumeBiz",
  companyAddress: [
    company?.address,
    company?.area,
    company?.city,
    company?.state,
    company?.country,
    company?.pincode,
  ]
    .filter(Boolean)
    .join(", "),
  companyPhone: company?.mobile || "",
  companyEmail: company?.email || user?.email || "",

  invoiceNo: sale.invoice_no || sale.invoiceNo || "",
  invoiceDate:
    sale.invoice_date || sale.order_date || new Date().toLocaleString(),

  customerName:
    customer?.company_name ||
    customer?.name ||
    [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
    "Walk-in",
  customerNumber:
    customer?.contact_no_1 ||
    customer?.mobile ||
    customer?.phone ||
    customer?.mobile_number ||
    "",

  paymentMode,
  transportationDetails: transportationDetails || "",

  subtotal: Number(subtotal) || 0,
  totalDiscount: discountValue,
  totalTax: Number(tax) || 0,
  finalPaymentAmount: invoiceAmount,
  amountReceived: amountPaid,

  // account values
  invoiceAmount,
  previousOutstanding,
  totalAmount: totalPayable,
  totalPaid: amountPaid,
  remainingOutstanding: Math.max(0, totalPayable - amountPaid),

  receipt_size: "58mm",
  isGSTUser: false,
  isIntraState: true,

  items: cartItems.map((item) => ({
    name: item.isCalculatorItem
      ? item.product || item.name || ""
      : item.product_name ||
        item.item_name ||
        item.productName ||
        item.title ||
        item.name ||
        "",
    product_name:
      item.product_name ||
      item.item_name ||
      item.productName ||
      item.title ||
      item.name ||
      "",
    isCalculatorItem: !!item.isCalculatorItem,
    qty: Number(item.qty) || 0,
    price: Number(item.price) || 0,
    rate: Number(item.price) || 0,
    amount: (Number(item.qty) || 0) * (Number(item.price) || 0),
    description: item.description || "",
    desc: item.description || "",
    discount: 0,
    gstRate: 0,
    hsn: item.hsn || "",
  })),
});
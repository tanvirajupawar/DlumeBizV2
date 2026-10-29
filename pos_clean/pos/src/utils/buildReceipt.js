export const buildReceipt = ({
  company,
  user,
  customer,
  sale,
    saleDate,
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
  sale?.invoice_date ||
  sale?.order_date ||
  saleDate ||
  new Date().toLocaleDateString("en-GB"),

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

items: cartItems.map((item) => {
  const productName = item.isCalculatorItem
    ? item.product || item.name || ""
    : item.product_name ||
      item.item_name ||
      item.productName ||
      item.title ||
      item.name ||
      "";

 const productType =
  item.type ||
  item.product_type ||
  item.productType ||
  "";

return {
  // Product name and type
  name: productType
    ? `${productName} ${productType}`
    : productName,

  product_name: productName,
  type: productType,
  product_type: productType,

  isCalculatorItem: !!item.isCalculatorItem,

  // Quantity and pricing
  qty: Number(item.qty) || 0,
  price: Number(item.price) || 0,
  rate: Number(item.price) || 0,
  amount: (Number(item.qty) || 0) * (Number(item.price) || 0),

  // SIZE — pass the actual cart value
  size:
    item.size ??
    item.product_size ??
    item.size_name ??
    item.variant_size ??
    "",

  product_size:
    item.product_size ??
    item.size ??
    item.size_name ??
    item.variant_size ??
    "",

  // B*U — bags and units per bag
  bags: Number(item.bags ?? item.bag_qty ?? 0) || 0,

  units_per_bag:
    Number(item.units_per_bag ?? item.unitsPerBag ?? 0) || 0,

  description: item.description || "",
  desc: item.description || "",
  discount: 0,
  gstRate: 0,
  hsn: item.hsn || "",
};
}),
});
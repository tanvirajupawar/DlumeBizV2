
const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const number = (value) => {
  const n = Number(value || 0);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
};

const money = (value) => `₹${number(value)}`;

const formatDate = (value) => {
  if (!value) return "-";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};


const getItemName = (item) => {
  if (item?.isCalculatorItem) {
    return `${number(item.qty)}*${number(item.rate)}rs`;
  }

  let name =
    item?.product_name ||
    item?.name ||
    item?.product ||
    item?.description ||
    "Item";

  const type = item?.type || item?.product_type || "";

  if (type) {
    name = `${String(name).trim()} -${String(type).trim()}`;
  }

  return name;
};


const wrapName = (name, max = 14) => {
  const words = String(name).trim().split(/\s+/);
  const lines = [];
  let line = "";

  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;

    if (line && (next.length > max || line.split(" ").length >= 3)) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });

  if (line) lines.push(line);
  return lines;
};

const sunmiItems = (items) =>
  items.map((item) => {
    const qty = Number(item.qty ?? item.quantity ?? 0);
    const rate = Number(item.rate ?? item.price ?? 0);
    const amount = Number(item.amount ?? qty * rate);

    const size =
      item.size ||
      item.product_size ||
      item.size_name ||
      item.variant_size ||
      "-";

    const bags = Number(item.bags || item.bag_qty || 0);
    const units = Number(
      item.units_per_bag || item.unitsPerBag || 0
    );

    const bagsUnit =
      !item.isCalculatorItem && bags > 0 && units > 0
        ? `${number(bags)}*${number(units)}`
        : "-";

    const lines = wrapName(getItemName(item));

    return `
      <tr>
        <td>
          ${lines.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}
        </td>
        <td>${escapeHtml(size)}</td>
        <td>${escapeHtml(bagsUnit)}</td>
        <td class="right">${number(qty)}</td>
        <td class="right">${money(rate)}</td>
        <td class="right">${money(amount)}</td>
      </tr>
    `;
  }).join("");

const bluetoothItems = (items) =>
  items.map((item) => {
    const qty = Number(item.qty ?? item.quantity ?? 1);
    const rate = Number(item.price ?? item.rate ?? 0);
    const amount = Number(item.amount ?? rate * qty);

    const lines = wrapName(getItemName(item));

    return `
      <tr>
        <td>
          ${lines.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}
        </td>
        <td class="right">${number(qty)}</td>
        <td class="right">${number(rate)}</td>
        <td class="right">${number(amount)}</td>
      </tr>
    `;
  }).join("");

const row = (label, value) => `
  <div class="summary-row">
    <span>${escapeHtml(label)}</span>
    <span>${escapeHtml(value)}</span>
  </div>
`;

export const buildReceiptHtml = (receipt, printerType = "sunmi") => {
  const items = Array.isArray(receipt?.items) ? receipt.items : [];
  const isSunmi = printerType === "sunmi";

  const width = receipt?.receipt_size === "80mm" ? 80 : 58;

  const subtotal = Number(receipt.subtotal || 0);
  const discount = Number(receipt.totalDiscount || 0);
  const grandTotal = Number(receipt.grandTotal || 0);
  const amountReceived = Number(receipt.amountReceived || 0);

  const invoiceAmount = Number(
    receipt.invoiceAmount ?? grandTotal
  );

  const previousOutstanding = Number(
    receipt.previousOutstanding || 0
  );

  const totalAmount = Number(
    receipt.totalAmount ?? invoiceAmount + previousOutstanding
  );

  const totalPaid = Number(
    receipt.totalPaid ?? amountReceived
  );

  const remainingOutstanding = Number(
    receipt.remainingOutstanding ??
      Math.max(totalAmount - totalPaid, 0)
  );

  const totalQty = items.reduce(
    (sum, item) => sum + Number(item.qty ?? item.quantity ?? 0),
    0
  );

  const itemsTotal = items.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const invoiceOnly = receipt.invoiceOnly === true;

  const customerName =
    receipt.customerName ||
    receipt.customer?.name ||
    "Walk-in Customer";

  const customerMobile =
    receipt.customerNumber ||
    receipt.customerPhone ||
    receipt.customerMobile ||
    receipt.customer?.phone ||
    receipt.customer?.mobile ||
    "";

  const header = `
    <div class="company">${escapeHtml(receipt.companyName || "D'LumeBiz")}</div>
    ${receipt.companyAddress
      ? `<div class="center">${escapeHtml(receipt.companyAddress)}</div>`
      : ""}
    ${receipt.companyPhone
      ? `<div class="center">Ph: ${escapeHtml(receipt.companyPhone)}</div>`
      : ""}
    ${!isSunmi && receipt.companyEmail
      ? `<div class="center">${escapeHtml(receipt.companyEmail)}</div>`
      : ""}
  `;

  const details = `
    ${row("Invoice No", receipt.invoiceNo || "-")}
    ${row("Date", formatDate(receipt.invoiceDate))}
    ${row("Customer", customerName)}
    ${customerMobile ? row("Mobile", customerMobile) : ""}
    ${row("Payment Method", receipt.paymentMode || "Cash")}
    ${receipt.transportationDetails
      ? row("Transportation", receipt.transportationDetails)
      : ""}
  `;

  const table = isSunmi
    ? `
      <table class="sunmi-table">
        <thead>
          <tr>
            <th>ITEM</th>
            <th>SIZE</th>
            <th>B*U</th>
            <th class="right">QTY</th>
            <th class="right">RATE</th>
            <th class="right">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          ${sunmiItems(items)}
          <tr class="total-row">
            <td colspan="3">TOTAL</td>
            <td class="right">${number(totalQty)}</td>
            <td></td>
            <td class="right">${money(itemsTotal)}</td>
          </tr>
        </tbody>
      </table>
    `
    : `
      <table class="bluetooth-table">
        <thead>
          <tr>
            <th>ITEM</th>
            <th class="right">QTY</th>
            <th class="right">RATE</th>
            <th class="right">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          ${bluetoothItems(items)}
        </tbody>
      </table>
    `;

  const summary = `
    ${discount > 0 ? row("Discount", `-${money(discount)}`) : ""}
    ${
      isSunmi
        ? invoiceOnly
          ? `
            ${row("Invoice Amount", money(grandTotal))}
            ${row("Paid", money(amountReceived))}
            ${row("Pending", money(Math.max(grandTotal - amountReceived, 0)))}
          `
          : `
            ${row("Invoice Amount", money(invoiceAmount))}
            ${row("Previous Outstanding", money(previousOutstanding))}
            <hr/>
            <div class="total-row">
              ${row("Total Amount", money(totalAmount))}
            </div>
            ${row("Total Paid", money(totalPaid))}
            <hr/>
            <div class="remaining">
              Remaining Outstanding: ${money(remainingOutstanding)}
            </div>
          `
        : `
          ${row("Subtotal", money(subtotal))}
          ${discount > 0 ? "" : ""}
          <div class="grand">${row("TOTAL", money(grandTotal))}</div>
          ${row(`Paid (${receipt.paymentMode || "Cash"})`, money(amountReceived))}
        `
    }
  `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        @page {
          margin: 3mm;
        }

        * {
          box-sizing: border-box;
        }

        body {
          font-family: Arial, sans-serif;
          color: #111;
          width: ${width}mm;
          margin: 0 auto;
          padding: 2mm;
          font-size: 9px;
        }

        .company {
          text-align: center;
          font-size: 15px;
          font-weight: bold;
          margin-bottom: 4px;
        }

        .center {
          text-align: center;
          margin-bottom: 3px;
        }

        .divider {
          border-top: 1px dashed #111;
          margin: 7px 0;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          gap: 5px;
          margin: 4px 0;
        }

        .summary-row span:first-child {
          overflow-wrap: anywhere;
        }

        .summary-row span:last-child {
          text-align: right;
          white-space: nowrap;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          margin: 7px 0;
          font-size: ${isSunmi ? "7px" : "8px"};
        }

        th, td {
          padding: 4px 1px;
          border-bottom: 1px dashed #aaa;
          overflow-wrap: anywhere;
          vertical-align: top;
        }

        th {
          text-align: left;
          border-top: 1px dashed #111;
          border-bottom: 1px dashed #111;
        }

        .sunmi-table th:nth-child(1),
        .sunmi-table td:nth-child(1) { width: 30%; }

        .sunmi-table th:nth-child(2),
        .sunmi-table td:nth-child(2) { width: 12%; }

        .sunmi-table th:nth-child(3),
        .sunmi-table td:nth-child(3) { width: 12%; }

        .sunmi-table th:nth-child(4),
        .sunmi-table td:nth-child(4) { width: 10%; }

        .sunmi-table th:nth-child(5),
        .sunmi-table td:nth-child(5) { width: 15%; }

        .sunmi-table th:nth-child(6),
        .sunmi-table td:nth-child(6) { width: 21%; }

        .bluetooth-table th:first-child,
        .bluetooth-table td:first-child { width: 44%; }

        .bluetooth-table th:nth-child(2),
        .bluetooth-table td:nth-child(2) { width: 12%; }

        .bluetooth-table th:nth-child(3),
        .bluetooth-table td:nth-child(3) { width: 20%; }

        .bluetooth-table th:nth-child(4),
        .bluetooth-table td:nth-child(4) { width: 24%; }

        .right {
          text-align: right;
        }

        .total-row {
          font-weight: bold;
        }

        .grand {
          font-weight: bold;
          font-size: 11px;
          border-top: 1px solid #111;
          border-bottom: 1px solid #111;
          padding: 4px 0;
        }

        .remaining {
          text-align: center;
          font-weight: bold;
          margin: 7px 0;
        }

        .footer {
          text-align: center;
          margin-top: 10px;
          font-weight: bold;
        }

        .branding {
          text-align: center;
          font-size: 8px;
          margin-top: 6px;
        }
      </style>
    </head>
    <body>
      ${header}
      <div class="divider"></div>
      ${details}
      <div class="divider"></div>
      ${table}
      <div class="divider"></div>
      ${summary}
      <div class="divider"></div>
      <div class="footer">Thank you for shopping with us!</div>
      ${isSunmi ? "" : '<div class="center">Please visit again</div>'}
      <div class="divider"></div>
      <div class="branding">Powered by D'LumeBiz POS</div>
    </body>
    </html>
  `;
};

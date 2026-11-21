
const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const getNumber = (value) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

// Same number formatting as ReceiptFormatter.java
const fmt = (value) => {
  const n = getNumber(value);
  if (Number.isInteger(n)) return String(Math.trunc(n));
  return n.toFixed(2);
};

const money = (value) => `₹${fmt(value)}`;

const getStr = (object, key) => {
  const value = object?.[key];
  return value == null ? "" : String(value);
};

// Same date format as Java: dd-MM-yyyy hh:mm a, IST
const formatDate = (isoDate) => {
  if (!isoDate) return "";

  const raw = String(isoDate).trim();
  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) return raw;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const part = (type) =>
    parts.find((entry) => entry.type === type)?.value || "";

  return `${part("day")}-${part("month")}-${part("year")} ${part(
    "hour"
  )}:${part("minute")} ${part("dayPeriod").toUpperCase()}`;
};

const getItemData = (item) => {
  const qty = getNumber(item?.qty);
  const rate = getNumber(item?.rate);
  const amount = getNumber(item?.amount);

  const isCalculatorItem = item?.isCalculatorItem === true;

  let name = "";
  let size = "-";
  let bagsUnit = "-";

  if (isCalculatorItem) {
    name = `${fmt(qty)}*${fmt(rate)}rs`;
  } else {
    name =
      getStr(item, "product_name") ||
      getStr(item, "name") ||
      getStr(item, "product") ||
      "Item";

    const type =
      getStr(item, "type") || getStr(item, "product_type");

    if (type) name += ` (${type})`;

    size =
      getStr(item, "size") ||
      getStr(item, "product_size") ||
      getStr(item, "size_name") ||
      getStr(item, "variant_size") ||
      "-";

    let bags = getNumber(item?.bags);
    if (bags === 0) bags = getNumber(item?.bag_qty);

    let units = getNumber(item?.units_per_bag);
    if (units === 0) units = getNumber(item?.unitsPerBag);

    if (bags > 0 && units > 0) {
      bagsUnit = `${fmt(bags)}*${fmt(units)}`;
    }
  }

  return {
    name,
    size,
    bagsUnit,
    qty: fmt(qty),
    rate: fmt(rate),
    amount: fmt(amount),
  };
};

// Same dynamic column-width calculation as ReceiptFormatter.java
const getReceiptColumnWidths = (items, nominalWidth, totals) => {
  let qtyLen = "QTY".length;
  let rateLen = "RATE".length;
  let amtLen = "AMOUNT".length;
  let sizeLen = "SIZE".length;
  let bagsLen = "B*U".length;

  items.forEach((item) => {
    const values = getItemData(item);

    qtyLen = Math.max(qtyLen, values.qty.length);
    rateLen = Math.max(rateLen, values.rate.length);
    amtLen = Math.max(amtLen, values.amount.length);
    sizeLen = Math.max(sizeLen, Math.max(1, values.size.length));
    bagsLen = Math.max(bagsLen, values.bagsUnit.length);
  });

  amtLen = Math.max(amtLen, (`₹${fmt(totals.invoiceAmount)}`).length);
  amtLen = Math.max(
    amtLen,
    (`₹${fmt(totals.previousOutstanding)}`).length
  );
  amtLen = Math.max(amtLen, (`₹${fmt(totals.totalAmount)}`).length);
  amtLen = Math.max(amtLen, (`₹${fmt(totals.totalPaid)}`).length);
  amtLen = Math.max(
    amtLen,
    (`₹${fmt(totals.remainingOutstanding)}`).length
  );

  let qtyWeight = qtyLen + 1;
  let rateWeight = rateLen + 1;
  let amtWeight = amtLen + 1;
  let sizeWeight = sizeLen + 1;
  let bagsWeight = bagsLen + 1;

  const fixedWidth =
    sizeWeight + bagsWeight + qtyWeight + rateWeight + amtWeight;

  let itemWeight = Math.max(1, nominalWidth - fixedWidth);

  if (itemWeight + fixedWidth > nominalWidth) {
    const available = Math.max(6, nominalWidth - 6);

    sizeWeight = Math.min(sizeWeight, 5);
    bagsWeight = Math.min(bagsWeight, 7);
    qtyWeight = Math.min(qtyWeight, 6);
    rateWeight = Math.min(rateWeight, 8);

    amtWeight = Math.max(
      6,
      available -
        sizeWeight -
        bagsWeight -
        qtyWeight -
        rateWeight
    );

    itemWeight = Math.max(
      1,
      nominalWidth -
        sizeWeight -
        bagsWeight -
        qtyWeight -
        rateWeight -
        amtWeight
    );
  }

  return [
    itemWeight,
    sizeWeight,
    bagsWeight,
    qtyWeight,
    rateWeight,
    amtWeight,
  ];
};

const makeDivider = (width) => "-".repeat(width);

const renderCell = (value, className = "") =>
  `<td class="${className}">${escapeHtml(value)}</td>`;

const renderItemRows = (items) =>
  items
    .map((item) => {
      const values = getItemData(item);

      return `
        <tr class="item-row">
          ${renderCell(values.name, "item-cell")}
          ${renderCell(values.size)}
          ${renderCell(values.bagsUnit)}
          ${renderCell(values.qty, "right")}
          ${renderCell(values.rate, "right")}
          ${renderCell(values.amount, "right")}
        </tr>
      `;
    })
    .join("");

const renderTotalRow = (label, value) => `
  <div class="total-line">
    <span class="total-label">${escapeHtml(label)}</span>
    <span class="total-value">${escapeHtml(value)}</span>
  </div>
`;

export const buildReceiptHtml = (receipt) => {
  const items = Array.isArray(receipt?.items) ? receipt.items : [];

  // PDF paper width comes from the saved receipt setting.
  const is80mm =
    String(receipt?.receipt_size || "").toLowerCase() === "80mm";

// Use wider 80mm layout for the PDF receipt
const paperWidth = 80;
const nominalWidth = 48;

  // Same fallback order as ReceiptFormatter.java
  let grandTotal = getNumber(receipt?.grandTotal);

  if (grandTotal === 0) {
    grandTotal = getNumber(receipt?.invoiceAmount);
  }

  if (grandTotal === 0) {
    grandTotal = getNumber(receipt?.finalPaymentAmount);
  }

  const amountReceived = getNumber(receipt?.amountReceived);
  const invoiceAmount = grandTotal;

  let previousOutstanding = getNumber(receipt?.previousOutstanding);

  if (previousOutstanding === 0) {
    previousOutstanding = getNumber(receipt?.previous_outstanding);
  }

  const totalAmount = invoiceAmount + previousOutstanding;
  const totalPaid = amountReceived;
  const remainingOutstanding = Math.max(0, totalAmount - totalPaid);

  const totals = {
    invoiceAmount,
    previousOutstanding,
    totalAmount,
    totalPaid,
    remainingOutstanding,
  };

  const tableCols = getReceiptColumnWidths(
    items,
    nominalWidth,
    totals
  );

  const totalWidth = tableCols.reduce(
    (sum, width) => sum + width,
    0
  );

  const labelWeight = tableCols
    .slice(0, 5)
    .reduce((sum, width) => sum + width, 0);

  const columnPercentages = tableCols.map(
    (width) => `${(width / totalWidth) * 100}%`
  );

  const tableColumnGroup = `
    <colgroup>
      ${columnPercentages
        .map((width) => `<col style="width:${width}" />`)
        .join("")}
    </colgroup>
  `;

  const divider = makeDivider(totalWidth);

  const tableHeader = `
    <tr class="table-header">
      <th>ITEM</th>
      <th>SIZE</th>
      <th>B*U</th>
      <th class="right">QTY</th>
      <th class="right">RATE</th>
      <th class="right">AMOUNT</th>
    </tr>
  `;

  const companyName = getStr(receipt, "companyName");
  const invoiceNo = getStr(receipt, "invoiceNo");
  const customerName = getStr(receipt, "customerName");
  const invoiceDate = getStr(receipt, "invoiceDate");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <style>
          @page {
            size: ${paperWidth}mm auto;
            margin: 0;
          }

          * {
            box-sizing: border-box;
          }

 html,
body {
  width: ${paperWidth}mm;
  margin: 0 auto;
  padding: 0;
  background: #ffffff;
  color: #000000;
  font-family: "Courier New", Courier, monospace;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

body {
  padding: 2mm 3mm;
  font-size: 8pt;
  line-height: 1.25;
  font-weight: 400;
  text-align: center;
}

          .tax-invoice {
            text-align: center;
            font-size: 8pt;
            line-height: 1.25;
            font-weight: 400;
            margin: 0;
          }

          .company-name {
            text-align: center;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11.33pt;
            line-height: 1.2;
            font-weight: 700;
            overflow-wrap: anywhere;
            margin: 0;
          }

          .divider {
            width: 100%;
            margin: 1.1mm 0;
            overflow: hidden;
            white-space: pre;
            font-family: "Courier New", Courier, monospace;
            font-size: 8pt;
            line-height: 1.25;
            letter-spacing: 0;
          }

          .receipt-details {
            font-family: "Courier New", Courier, monospace;
            font-size: 8pt;
            line-height: 1.35;
            overflow-wrap: anywhere;
          }

          .detail-line {
            margin: 0;
            padding: 0;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            margin: 0;
            font-family: "Courier New", Courier, monospace;
            font-size: 7.4pt;
            line-height: 1.25;
          }

          th,
          td {
            padding: 0.7mm 0.15mm;
            margin: 0;
            vertical-align: top;
            font-weight: 400;
            overflow-wrap: anywhere;
            word-break: break-word;
          }

          th {
            font-weight: 700;
            text-align: left;
            white-space: normal;
          }

          .right {
            text-align: right;
          }

          .item-cell {
            text-align: left;
            word-break: break-word;
            overflow-wrap: anywhere;
          }

          .total-block {
            width: 100%;
            font-family: "Courier New", Courier, monospace;
            font-size: 8pt;
            line-height: 1.35;
          }

          .total-line {
            display: flex;
            width: 100%;
            align-items: flex-start;
            margin: 0;
            padding: 0.35mm 0;
          }

          .total-label {
            width: ${(labelWeight / totalWidth) * 100}%;
            text-align: left;
            overflow-wrap: anywhere;
            word-break: break-word;
          }

          .total-value {
            flex: 1;
            text-align: right;
            white-space: nowrap;
          }

          .remaining-outstanding {
            width: 100%;
            text-align: center;
            font-family: "Courier New", Courier, monospace;
            font-size: 8pt;
            line-height: 1.35;
            font-weight: 700;
            overflow-wrap: anywhere;
            margin: 0;
          }

          .footer {
            width: 100%;
            text-align: center;
            font-family: "Courier New", Courier, monospace;
            font-size: 8pt;
            line-height: 1.35;
            font-weight: 400;
          }

          .branding {
            width: 100%;
            text-align: center;
            font-family: "Courier New", Courier, monospace;
            font-size: 6pt;
            line-height: 1.25;
            font-weight: 400;
          }

          .receipt-details {
  text-align: left;
  width: 100%;
  margin: 0 auto;
}

table {
  width: 100%;
  margin: 0 auto;
}

.total-block {
  width: 100%;
  margin: 0 auto;
}

.divider {
  text-align: center;
  width: 100%;
}

.company-name,
.footer,
.branding,
.remaining-outstanding {
  text-align: center;
  width: 100%;
}

          tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        </style>
      </head>

      <body>
        <div class="company-name">${escapeHtml(companyName)}</div>

        <div class="divider">${escapeHtml(divider)}</div>

        <div class="receipt-details">
          <div class="detail-line">Invoice: ${escapeHtml(invoiceNo)}</div>
          <div class="detail-line">Date: ${escapeHtml(formatDate(invoiceDate))}</div>
          <div class="detail-line">Customer: ${escapeHtml(customerName)}</div>
        </div>

        <div class="divider">${escapeHtml(divider)}</div>

        <table>
          ${tableColumnGroup}
          <thead>
            ${tableHeader}
          </thead>
          <tbody>
            ${renderItemRows(items)}
          </tbody>
        </table>

        <div class="divider">${escapeHtml(divider)}</div>

        <div class="total-block">
          ${renderTotalRow("Invoice Amount", money(invoiceAmount))}
          ${renderTotalRow(
            "Previous Outstanding",
            money(previousOutstanding)
          )}
        </div>

        <div class="divider">${escapeHtml(divider)}</div>

        <div class="total-block">
          ${renderTotalRow("Total Amount", money(totalAmount))}
          ${renderTotalRow("Total Paid", money(totalPaid))}
        </div>

        <div class="divider">${escapeHtml(divider)}</div>

        <div class="remaining-outstanding">
          Remaining Outstanding: ${escapeHtml(money(remainingOutstanding))}
        </div>

        <div class="divider">${escapeHtml(divider)}</div>

        <div class="footer">
          <div>Thank you for shopping with us!</div>
          <div>Please visit again</div>
        </div>

        <div class="divider">${escapeHtml(divider)}</div>

        <div class="branding">Powered by D'LumeBiz POS</div>
      </body>
    </html>
  `;
};

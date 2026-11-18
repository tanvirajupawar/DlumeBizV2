package com.tanvipawar.pos;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.sunmi.peripheral.printer.SunmiPrinterService;

import java.util.Locale;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.TimeZone;

public class ReceiptFormatter {

    private static final float BASE_FONT = 24f;   // used for ALL body text, tables, dividers
    private static final float HEADER_FONT = 34f; // company name only
    private static final float TOTAL_FONT = 30f;  // TOTAL value only
    private static final float FOOTER_FONT = 18f; // "Powered by" branding line


    private static final int NOMINAL_WIDTH_58 = 32;
    private static final int NOMINAL_WIDTH_80 = 48;

    // printColumnsString alignment constants
    private static final int ALIGN_LEFT = 0;
    private static final int ALIGN_CENTER = 1;
    private static final int ALIGN_RIGHT = 2;

    public static void printReceipt(
            SunmiPrinterService printer,
            ReadableMap receipt
    ) throws Exception {

        printer.printerInit(null);
        printer.setFontSize(BASE_FONT, null); // set base font FIRST, before anything

        int nominalWidth = resolveNominalWidth(printer, receipt);

        String companyName = getStr(receipt, "companyName");
        String invoiceNo = getStr(receipt, "invoiceNo");
        String customerName = getStr(receipt, "customerName");
        String invoiceDate = getStr(receipt, "invoiceDate");
        android.util.Log.d("RECEIPT_TIME", "RAW invoiceDate = " + invoiceDate);
        String paymentMode = getStr(receipt, "paymentMode");
        boolean isGSTUser = receipt.hasKey("isGSTUser") && receipt.getBoolean("isGSTUser");

        double subtotal = getDouble(receipt, "subtotal");
        double totalDiscount = getDouble(receipt, "totalDiscount");
        double totalTax = getDouble(receipt, "totalTax");
        double grandTotal = getDouble(receipt, "grandTotal");
        double amountReceived = getDouble(receipt, "amountReceived");
        double change = amountReceived - grandTotal;

        ReadableArray items = receipt.hasKey("items") ? receipt.getArray("items") : null;

        // ---------- Work out column WIDTHS (in characters) from the DATA ----------
        // QTY/RATE/AMOUNT get exactly enough characters for the widest value
        // that will ever land in them (item rows AND the totals block below);
        // ITEM gets whatever is left of the real per-line capacity resolved
        // above. Columns always sum to nominalWidth, so the table always
        // reaches the printer's actual full line width with no dead space.
      int qtyLen = "QTY".length();
int rateLen = "RATE".length();
int amtLen = "AMOUNT".length();
int sizeLen = "SIZE".length();
int bagsLen = "B*U".length();

if (items != null) {
    for (int i = 0; i < items.size(); i++) {
        ReadableMap item = items.getMap(i);

        qtyLen = Math.max(qtyLen, fmt(getDouble(item, "qty")).length());
        rateLen = Math.max(rateLen, fmt(getDouble(item, "rate")).length());
        amtLen = Math.max(amtLen, fmt(getDouble(item, "amount")).length());

        String size = getStr(item, "size");
        if (size.isEmpty()) size = getStr(item, "product_size");
        if (size.isEmpty()) size = getStr(item, "size_name");
        if (size.isEmpty()) size = getStr(item, "variant_size");

        sizeLen = Math.max(sizeLen, Math.max(1, size.length()));

        double bags = getDouble(item, "bags");
        if (bags == 0) bags = getDouble(item, "bag_qty");

        double units = getDouble(item, "units_per_bag");
        if (units == 0) units = getDouble(item, "unitsPerBag");

        String bagsUnit =
                bags > 0 && units > 0
                        ? fmt(bags) + "*" + fmt(units)
                        : "-";

        bagsLen = Math.max(bagsLen, bagsUnit.length());
    }
}

amtLen = Math.max(amtLen, fmt(subtotal).length());
amtLen = Math.max(amtLen, fmt(grandTotal).length());
amtLen = Math.max(amtLen, fmt(amountReceived).length());

if (totalDiscount > 0)
    amtLen = Math.max(amtLen, fmt(totalDiscount).length() + 1);

if (isGSTUser && totalTax > 0)
    amtLen = Math.max(amtLen, fmt(totalTax).length());

if (change > 0)
    amtLen = Math.max(amtLen, fmt(change).length());

int qtyWeight = qtyLen + 1;
int rateWeight = rateLen + 1;
int amtWeight = amtLen + 1;
int sizeWeight = sizeLen + 1;
int bagsWeight = bagsLen + 1;


int fixedWidth =
        sizeWeight + bagsWeight + qtyWeight + rateWeight + amtWeight;

// Keep the table within the printer's actual line width.
// Give ITEM at least 1 character.
int itemWeight = Math.max(1, nominalWidth - fixedWidth);

// If fixed columns are too wide, reduce them to fit.
if (itemWeight + fixedWidth > nominalWidth) {
    int available = Math.max(6, nominalWidth - 6);

    sizeWeight = Math.min(sizeWeight, 5);
    bagsWeight = Math.min(bagsWeight, 7);
    qtyWeight = Math.min(qtyWeight, 6);
    rateWeight = Math.min(rateWeight, 8);

    amtWeight = Math.max(
            6,
            available - sizeWeight - bagsWeight
                    - qtyWeight - rateWeight
    );

    itemWeight = Math.max(
            1,
            nominalWidth - sizeWeight - bagsWeight
                    - qtyWeight - rateWeight - amtWeight
    );
}

int[] tableCols = {
        itemWeight,
        sizeWeight,
        bagsWeight,
        qtyWeight,
        rateWeight,
        amtWeight
};


int[] tableAlign = {
        ALIGN_LEFT,
        ALIGN_LEFT,
        ALIGN_LEFT,
        ALIGN_RIGHT,
        ALIGN_RIGHT,
        ALIGN_RIGHT
};

int labelWeight =
        itemWeight + sizeWeight + bagsWeight + qtyWeight + rateWeight;

int[] totalsCols = {labelWeight, amtWeight};
int[] totalsAlign = {ALIGN_LEFT, ALIGN_RIGHT};

        // ---------- Header: "TAX INVOICE" first, then company name ----------
        printer.setAlignment(1, null); // center
        printer.printText("TAX INVOICE\n", null);

        printer.setFontSize(HEADER_FONT, null);
        printer.printText(companyName + "\n", null);
        printer.setFontSize(BASE_FONT, null); // reset immediately after the name

        printDivider(printer, tableCols);

        // ---------- Invoice meta ----------
        printer.setAlignment(0, null); // left
        printer.printText("Invoice: " + invoiceNo + "\n", null);
        printer.printText("Date: " + formatDate(invoiceDate) + "\n", null);
        printer.printText("Customer: " + customerName + "\n", null);
        printDivider(printer, tableCols);

        // ---------- Items table ----------
        // Every row is printed through printColumnsString with the SAME
        // column-width array, so header, items, and totals all share one
        // true grid at the printer's real full line width.

// ---------- Items table ----------
printer.printColumnsString(
        new String[]{"ITEM", "SIZE", "B*U", "QTY", "RATE", "AMOUNT"},
        tableCols, tableAlign, null);

printDivider(printer, tableCols);

if (items != null) {
    for (int i = 0; i < items.size(); i++) {
        ReadableMap item = items.getMap(i);

        double qty = getDouble(item, "qty");
        double rate = getDouble(item, "rate");
        double amount = getDouble(item, "amount");

        boolean isCalculatorItem =
                item.hasKey("isCalculatorItem")
                && !item.isNull("isCalculatorItem")
                && item.getBoolean("isCalculatorItem");

        String name;
        String size = "-";
        String bagsUnit = "-";

        if (isCalculatorItem) {
            // Keep existing calculator item format
            name = fmt(qty) + "*" + fmt(rate) + "rs";
        } else {
            name = getStr(item, "product_name");
            if (name.isEmpty()) name = getStr(item, "name");
            if (name.isEmpty()) name = getStr(item, "product");
            if (name.isEmpty()) name = "Item";

            // Append product type beside the name
            String type = getStr(item, "type");
            if (type.isEmpty()) type = getStr(item, "product_type");

            if (!type.isEmpty()) {
                name += " (" + type + ")";
            }

            // Product size
            size = getStr(item, "size");
            if (size.isEmpty()) size = getStr(item, "product_size");
            if (size.isEmpty()) size = getStr(item, "size_name");
            if (size.isEmpty()) size = getStr(item, "variant_size");
            if (size.isEmpty()) size = "-";

            // Bags × units per bag
            double bags = getDouble(item, "bags");
            if (bags == 0) bags = getDouble(item, "bag_qty");

            double units = getDouble(item, "units_per_bag");
            if (units == 0) units = getDouble(item, "unitsPerBag");

            if (bags > 0 && units > 0) {
                bagsUnit = fmt(bags) + "*" + fmt(units);
            }
        }

        printer.printColumnsString(
                new String[]{
                        name,
                        size,
                        bagsUnit,
                        fmt(qty),
                        fmt(rate),
                        fmt(amount)
                },
                tableCols,
                tableAlign,
                null
        );
    }
}


        printDivider(printer, tableCols);

        // ---------- Totals: label spans ITEM+QTY+RATE, value under AMOUNT ----------
        printer.printColumnsString(
                new String[]{"Subtotal", fmt(subtotal)}, totalsCols, totalsAlign, null);
        if (totalDiscount > 0) {
            printer.printColumnsString(
                    new String[]{"Discount", "-" + fmt(totalDiscount)}, totalsCols, totalsAlign, null);
        }
        if (isGSTUser && totalTax > 0) {
            printer.printColumnsString(
                    new String[]{"Tax", fmt(totalTax)}, totalsCols, totalsAlign, null);
        }

        printer.setFontSize(TOTAL_FONT, null);
        printer.printColumnsString(
                new String[]{"TOTAL", fmt(grandTotal)}, totalsCols, totalsAlign, null);
        printer.setFontSize(BASE_FONT, null); // reset immediately after TOTAL

        printDivider(printer, tableCols);

        // ---------- Payment: same totals grid ----------
        printer.printColumnsString(
                new String[]{"Paid (" + paymentMode + ")", fmt(amountReceived)}, totalsCols, totalsAlign, null);
        if (change > 0) {
            printer.printColumnsString(
                    new String[]{"Change", fmt(change)}, totalsCols, totalsAlign, null);
        }
        printDivider(printer, tableCols);

        // ---------- Footer ----------
        printer.setAlignment(1, null); // center
        printer.printText("Thank you for shopping with us!\n", null);
        printer.printText("Please visit again\n", null);
        printDivider(printer, tableCols);

        // ---------- Branding ----------
        printer.setFontSize(FOOTER_FONT, null);
        printer.printText("Powered by D'LumeBiz POS\n", null);
        printer.setFontSize(BASE_FONT, null);

        printer.lineWrap(4, null);
    }

    // ---------- Helpers ----------

    // Asks the printer HARDWARE which paper is actually loaded, rather than
    // trusting a caller-supplied flag. This is what fixes real full-width
    // usage: previously, whenever "receipt_size" didn't arrive as the exact
    // string "80mm" from the JS side (missing key, different casing, not
    // sent at all), the code silently fell back to the 58mm character grid
    // on physical 80mm paper — a ~32/48 = 67% width receipt, which is
    // exactly the compression visible in practice. getPrinterPaper() is
    // synchronous and returns 1 for 58mm paper, otherwise 80mm. It's only
    // supported on printer-service versions >= 4.1.2 (or the specific
    // per-model versions Sunmi lists), so if the call isn't available on a
    // given device we fall back to the caller-supplied flag instead of
    // failing the whole print job.
    private static int resolveNominalWidth(SunmiPrinterService printer, ReadableMap receipt) {
        try {
            int paper = printer.getPrinterPaper();
            return paper == 1 ? NOMINAL_WIDTH_58 : NOMINAL_WIDTH_80;
        } catch (Throwable ignored) {
            // Older printer-service versions don't implement this call —
            // fall back to whatever the caller told us.
            boolean is80mm = receipt.hasKey("receipt_size")
                    && "80mm".equals(receipt.getString("receipt_size"));
            return is80mm ? NOMINAL_WIDTH_80 : NOMINAL_WIDTH_58;
        }
    }

    // Draws a divider as a single plain-text line of dashes, built to the
    // exact same total width as the table's columns above/below it — so it
    // lines up with the same left/right edges as the table without going
    // through printColumnsString at all. (A single-column printColumnsString
    // call turned out to be the wrong tool here: several Sunmi firmware
    // builds mishandle a lone-column call and print a small orphaned
    // fragment before the real line. Plain printText has no such quirk.)
    private static void printDivider(SunmiPrinterService printer, int[] cols) throws Exception {
        int totalWidth = 0;
        for (int w : cols) totalWidth += w;
        printer.printText(repeat('-', totalWidth) + "\n", null);
    }

    private static String getStr(ReadableMap map, String key) {
        return map.hasKey(key) && !map.isNull(key) ? map.getString(key) : "";
    }

    private static double getDouble(ReadableMap map, String key) {
        return map.hasKey(key) && !map.isNull(key) ? map.getDouble(key) : 0.0;
    }

  private static String fmt(double value) {

    if (value == Math.floor(value)) {
        return String.valueOf((long) value);
    }

    return String.format(
            Locale.US,
            "%.2f",
            value
    );
}

    private static String repeat(char c, int count) {
        StringBuilder sb = new StringBuilder(Math.max(count, 0));
        for (int i = 0; i < count; i++) sb.append(c);
        return sb.toString();
    }

 

private static String formatDate(String isoDate) {
    if (isoDate == null || isoDate.isEmpty()) return "";

    try {
        String normalized = isoDate.trim();

        // Handle timestamps without milliseconds
        if (normalized.matches(".*T\\d{2}:\\d{2}:\\d{2}Z$")) {
            normalized = normalized.replace("Z", ".000Z");
        }

        java.time.Instant instant =
                java.time.Instant.parse(normalized);

        java.time.ZonedDateTime ist =
                instant.atZone(java.time.ZoneId.of("Asia/Kolkata"));

        return java.time.format.DateTimeFormatter
                .ofPattern("dd-MM-yyyy hh:mm a", Locale.US)
                .format(ist);

    } catch (Exception e) {
        return isoDate;
    }
}


}
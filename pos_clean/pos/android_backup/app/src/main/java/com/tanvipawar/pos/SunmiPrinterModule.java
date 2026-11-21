package com.tanvipawar.pos;
import androidx.annotation.NonNull;

import android.util.Log;

import java.util.Locale;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;

import com.sunmi.peripheral.printer.InnerPrinterCallback;
import com.sunmi.peripheral.printer.InnerPrinterManager;
import com.sunmi.peripheral.printer.SunmiPrinterService;

public class SunmiPrinterModule
        extends ReactContextBaseJavaModule {

    private SunmiPrinterService sunmiPrinterService;


    // ==================================================
    // CONSTRUCTOR
    // ==================================================

    public SunmiPrinterModule(
            ReactApplicationContext reactContext
    ) {
        super(reactContext);
    }


    // ==================================================
    // MODULE NAME
    // ==================================================

    @NonNull
    @Override
    public String getName() {
        return "SunmiPrinter";
    }


    // ==================================================
    // HELLO TEST
    // ==================================================

    @ReactMethod
    public void helloPrinter(Promise promise) {

        promise.resolve(
                "Hello from Sunmi Native Module"
        );
    }


    // ==================================================
    // CONNECT PRINTER
    // ==================================================

    @ReactMethod
    public void connectPrinter(Promise promise) {

        try {

            final boolean[] resolved = {false};

            final android.os.Handler handler =
                    new android.os.Handler(
                            getReactApplicationContext()
                                    .getMainLooper()
                    );


            // ------------------------------------------
            // TIMEOUT
            // ------------------------------------------

            Runnable timeout = () -> {

                if (!resolved[0]) {

                    resolved[0] = true;

                    promise.reject(
                            "CONNECT_TIMEOUT",
                            "Printer service did not connect in time"
                    );
                }
            };

            handler.postDelayed(
                    timeout,
                    5000
            );


            // ------------------------------------------
            // BIND SUNMI PRINTER SERVICE
            // ------------------------------------------

            boolean ret =
                    InnerPrinterManager
                            .getInstance()
                            .bindService(
                                    getReactApplicationContext(),

                                    new InnerPrinterCallback() {

                                        @Override
                                        protected void onConnected(
                                                SunmiPrinterService service
                                        ) {

                                            sunmiPrinterService =
                                                    service;

                                            Log.d(
                                                    "SunmiPrinter",
                                                    "Printer Connected"
                                            );


                                            if (!resolved[0]) {

                                                resolved[0] = true;

                                                handler.removeCallbacks(
                                                        timeout
                                                );

                                                promise.resolve(
                                                        "Printer connected"
                                                );
                                            }
                                        }


                                        @Override
                                        protected void onDisconnected() {

                                            sunmiPrinterService =
                                                    null;

                                            Log.d(
                                                    "SunmiPrinter",
                                                    "Printer Disconnected"
                                            );
                                        }
                                    }
                            );


            // ------------------------------------------
            // BIND FAILED
            // ------------------------------------------

            if (!ret) {

                resolved[0] = true;

                handler.removeCallbacks(
                        timeout
                );

                promise.reject(
                        "BIND_FAILED",
                        "bindService returned false"
                );
            }

        } catch (Exception e) {

            Log.e(
                    "SunmiPrinter",
                    "Connect failed",
                    e
            );

            promise.reject(
                    "ERROR",
                    e.getMessage()
            );
        }
    }


    // ==================================================
    // CHECK CONNECTION
    // ==================================================

    private boolean checkPrinter(
            Promise promise
    ) {

        if (sunmiPrinterService == null) {

            promise.reject(
                    "NO_PRINTER",
                    "Printer not connected"
            );

            return false;
        }

        return true;
    }


    // ==================================================
    // TEST PRINT
    // ==================================================

    @ReactMethod
    public void printTest(Promise promise) {

        if (!checkPrinter(promise)) {
            return;
        }

        try {

            sunmiPrinterService.printerInit(null);

            sunmiPrinterService.printText(
                    "--------------------------------\n",
                    null
            );

            sunmiPrinterService.printText(
                    "        D'LumeBiz POS\n",
                    null
            );

            sunmiPrinterService.printText(
                    "       Sunmi Test Print\n",
                    null
            );

            sunmiPrinterService.printText(
                    "--------------------------------\n",
                    null
            );

            sunmiPrinterService.printText(
                    "Printer Connected Successfully\n",
                    null
            );

            sunmiPrinterService.lineWrap(
                    4,
                    null
            );

            promise.resolve(
                    "Printed successfully"
            );

        } catch (Exception e) {

            Log.e(
                    "SunmiPrinter",
                    "Print test failed",
                    e
            );

            promise.reject(
                    "PRINT_ERROR",
                    e.getMessage()
            );
        }
    }


    // ==================================================
    // RECEIPT
    // ==================================================

    @ReactMethod
    public void printReceipt(
            ReadableMap receipt,
            Promise promise
    ) {

        if (!checkPrinter(promise)) {
            return;
        }

        try {

            ReceiptFormatter.printReceipt(
                    sunmiPrinterService,
                    receipt
            );

            promise.resolve(
                    "Receipt printed"
            );

        } catch (Exception e) {

            Log.e(
                    "SunmiPrinter",
                    "Receipt print failed",
                    e
            );

            promise.reject(
                    "PRINT_ERROR",
                    e.getMessage()
            );
        }
    }


// ==================================================
// DAILY SALES SUMMARY - 80MM
// ==================================================

@ReactMethod
public void printDailySalesSummary(
        ReadableMap summary,
        Promise promise
) {

    if (!checkPrinter(promise)) {
        return;
    }

    try {

        Log.d(
                "SunmiPrinter",
                "========== DAILY SALES SUMMARY 80MM =========="
        );

        sunmiPrinterService.printerInit(null);

        // --------------------------------------------------
        // 80MM SUNMI = 48 CHARACTER GRID
        // --------------------------------------------------

        final int WIDTH = 48;

        // --------------------------------------------------
        // DATE
        // --------------------------------------------------

        String date = "";

        if (
                summary.hasKey("date") &&
                !summary.isNull("date")
        ) {
            date = summary.getString("date");
        }

       // --------------------------------------------------
// HEADER
// --------------------------------------------------

        sunmiPrinterService.setAlignment(
                1,
                null
        );

        sunmiPrinterService.setFontSize(
                34,
                null
        );

        sunmiPrinterService.printText(
                "DAILY SALES SUMMARY\n",
                null
        );

        sunmiPrinterService.setFontSize(
                22,
                null
        );

        sunmiPrinterService.printText(
                date + "\n",
                null
        );

        // reset to body size BEFORE the table — this line was missing,
        // so the table header + every item row was inheriting the
        // smaller date-line font (20) instead of a proper body size
        sunmiPrinterService.setFontSize(
                24,
                null
        );

        sunmiPrinterService.setAlignment(
                0,
                null
        );

        sunmiPrinterService.printText(
                repeat('-', WIDTH) + "\n",
                null
        );

        // --------------------------------------------------
        // TABLE WIDTHS
        // --------------------------------------------------
        //
        // ITEM = 24
        // QTY  = 6
        // RATE = 8
        // AMOUNT = 10
        //
        // TOTAL = 48
        // --------------------------------------------------

        final int ITEM_WIDTH = 24;
        final int QTY_WIDTH = 6;
        final int RATE_WIDTH = 8;
        final int AMOUNT_WIDTH = 10;

        // --------------------------------------------------
        // TABLE HEADER
        // --------------------------------------------------

     int[] tableCols = {
        ITEM_WIDTH,
        QTY_WIDTH,
        RATE_WIDTH,
        AMOUNT_WIDTH
};

int[] tableAlign = {
        0,  // ITEM = LEFT
        2,  // QTY = RIGHT
        2,  // RATE = RIGHT
        2   // AMOUNT = RIGHT
};

sunmiPrinterService.printColumnsString(
        new String[]{
                "ITEM",
                "QTY",
                "RATE",
                "AMOUNT"
        },
        tableCols,
        tableAlign,
        null
);

        sunmiPrinterService.printText(
                repeat('-', WIDTH) + "\n",
                null
        );

        // --------------------------------------------------
        // ITEMS
        // --------------------------------------------------

        ReadableArray items = null;

        if (
                summary.hasKey("items") &&
                !summary.isNull("items")
        ) {
            items = summary.getArray("items");
        }

        if (items != null) {

            for (int i = 0; i < items.size(); i++) {

                ReadableMap item =
                        items.getMap(i);

                if (item == null) {
                    continue;
                }

                double qty =
                        item.hasKey("qty")
                                ? item.getDouble("qty")
                                : 0;

                double rate =
                        item.hasKey("rate")
                                ? item.getDouble("rate")
                                : 0;

                double amount =
                        item.hasKey("amount")
                                ? item.getDouble("amount")
                                : qty * rate;

          // ------------------------------------------
// ITEM DISPLAY
// ------------------------------------------

boolean isCalculatorItem =
        item.hasKey("isCalculatorItem")
        && !item.isNull("isCalculatorItem")
        && item.getBoolean("isCalculatorItem");

String itemName;

if (isCalculatorItem) {

    // Calculator item:
    // Keep the existing calculator-style display.
    itemName =
            formatQty(qty)
                    + " X "
                    + formatMoneyNoDecimal(rate);

} else {

    // Normal product:
    // Show the actual product name.
    itemName = "";

    if (
            item.hasKey("product_name")
            && !item.isNull("product_name")
    ) {
        itemName = item.getString("product_name");
    }

    if (
            itemName.isEmpty()
            && item.hasKey("name")
            && !item.isNull("name")
    ) {
        itemName = item.getString("name");
    }

    if (
            itemName.isEmpty()
            && item.hasKey("product")
            && !item.isNull("product")
    ) {
        itemName = item.getString("product");
    }

    if (itemName.isEmpty()) {
        itemName = "Item";
    }
}

// Keep item text inside its 24-char column
if (itemName.length() > ITEM_WIDTH) {
    itemName =
            itemName.substring(
                    0,
                    ITEM_WIDTH
            );
}

                // ------------------------------------------
                // ROW
                // ------------------------------------------

            sunmiPrinterService.printColumnsString(
        new String[]{
                itemName,
                formatQty(qty),
                formatMoneyNoDecimal(rate),
                formatMoneyNoDecimal(amount)
        },
        tableCols,
        tableAlign,
        null
);
            }
        }

        // --------------------------------------------------
        // TOTALS
        // --------------------------------------------------

        sunmiPrinterService.printText(
                repeat('-', WIDTH) + "\n",
                null
        );

        double totalItems =
                summary.hasKey("totalItems")
                        ? summary.getDouble("totalItems")
                        : 0;

        double totalSales =
                summary.hasKey("totalSales")
                        ? summary.getDouble("totalSales")
                        : 0;

// At font size 30, characters are wider than at the base 24, so the
// full 48-char WIDTH string no longer fits the physical line and the
// printer silently wraps it onto a second line. Use a narrower target
// width scaled to this font size so label+value stay on one line.
final int TOTALS_LINE_WIDTH = 38;

sunmiPrinterService.setFontSize(
        30,
        null
);

sunmiPrinterService.printText(
        twoColumn(
                "TOTAL ITEMS:",
                formatQty(totalItems),
                TOTALS_LINE_WIDTH
        ),
        null
);

// --------------------------------------------------
// TOTAL SALES
// --------------------------------------------------

sunmiPrinterService.printText(
        twoColumn(
                "TOTAL SALES:",
             formatMoneyNoDecimal(totalSales) + " Rs",
                TOTALS_LINE_WIDTH
        ),
        null
);

sunmiPrinterService.setFontSize(
        24,
        null
);

        // --------------------------------------------------
        // END
        // --------------------------------------------------

        sunmiPrinterService.printText(
                "\n\n\n",
                null
        );

        sunmiPrinterService.lineWrap(
                4,
                null
        );

        Log.d(
                "SunmiPrinter",
                "DAILY SALES SUMMARY 80MM PRINTED"
        );

        promise.resolve(
                "Daily sales summary printed"
        );

    } catch (Exception e) {

        Log.e(
                "SunmiPrinter",
                "Daily sales summary print failed",
                e
        );

        promise.reject(
                "DAILY_SUMMARY_PRINT_ERROR",
                e.getMessage()
        );
    }
}




    // ==================================================
    // DAILY PAYMENT SUMMARY - 80MM
    // ==================================================

    @ReactMethod
    public void printDailyPaymentSummary(
            ReadableMap summary,
            Promise promise
    ) {

        if (!checkPrinter(promise)) {
            return;
        }

        try {

            Log.d(
                    "SunmiPrinter",
                    "========== DAILY PAYMENT SUMMARY =========="
            );

            sunmiPrinterService.printerInit(null);

            final int WIDTH = 48;

            // ------------------------------------------
            // DATE
            // ------------------------------------------

            String date = summary.hasKey("date")
                    && !summary.isNull("date")
                    ? summary.getString("date")
                    : "";

            // ------------------------------------------
            // HEADER
            // ------------------------------------------

            sunmiPrinterService.setAlignment(1, null);
            sunmiPrinterService.setFontSize(34, null);

            sunmiPrinterService.printText(
                    "DAILY PAYMENT SUMMARY\n",
                    null
            );

            sunmiPrinterService.setFontSize(22, null);

            sunmiPrinterService.printText(
                    date + "\n",
                    null
            );

            sunmiPrinterService.setFontSize(24, null);
            sunmiPrinterService.setAlignment(0, null);

            sunmiPrinterService.printText(
                    repeat('-', WIDTH) + "\n",
                    null
            );

            // ------------------------------------------
            // PAYMENT TABLE
            // ------------------------------------------

            int[] cols = {24, 10, 14};
            int[] aligns = {0, 0, 2};

            sunmiPrinterService.printColumnsString(
                    new String[]{
                            "CUSTOMER",
                            "METHOD",
                            "AMOUNT"
                    },
                    cols,
                    aligns,
                    null
            );

            sunmiPrinterService.printText(
                    repeat('-', WIDTH) + "\n",
                    null
            );

            // ------------------------------------------
            // PAYMENT ITEMS
            // ------------------------------------------

            ReadableArray items = summary.hasKey("items")
                    && !summary.isNull("items")
                    ? summary.getArray("items")
                    : null;

            if (items != null) {

                for (int i = 0; i < items.size(); i++) {

                    ReadableMap item = items.getMap(i);

                    if (item == null) {
                        continue;
                    }

                    String customerName =
                            item.hasKey("customerName")
                                    && !item.isNull("customerName")
                                    ? item.getString("customerName")
                                    : "Customer";

                    String method =
                            item.hasKey("methodLabel")
                                    && !item.isNull("methodLabel")
                                    ? item.getString("methodLabel")
                                    : "Other";

                    double amount =
                            item.hasKey("amount")
                                    && !item.isNull("amount")
                                    ? item.getDouble("amount")
                                    : 0;

                    String invoiceNo =
                            item.hasKey("invoiceNo")
                                    && !item.isNull("invoiceNo")
                                    ? item.getString("invoiceNo")
                                    : "";

                    if (customerName.length() > 24) {
                        customerName = customerName.substring(0, 24);
                    }

                    if (method.length() > 10) {
                        method = method.substring(0, 10);
                    }

                    sunmiPrinterService.printColumnsString(
                            new String[]{
                                    customerName,
                                    method,
                                    formatMoneyNoDecimal(amount)
                            },
                            cols,
                            aligns,
                            null
                    );

                    if (!invoiceNo.isEmpty()) {
                        sunmiPrinterService.printText(
                                "  Invoice: " + invoiceNo + "\n",
                                null
                        );
                    }
                }
            }

            // ------------------------------------------
            // TOTALS
            // ------------------------------------------

            sunmiPrinterService.printText(
                    repeat('-', WIDTH) + "\n",
                    null
            );

            double cash = summary.hasKey("cash")
                    ? summary.getDouble("cash")
                    : 0;

            double upi = summary.hasKey("upi")
                    ? summary.getDouble("upi")
                    : 0;

            double card = summary.hasKey("card")
                    ? summary.getDouble("card")
                    : 0;

            double other = summary.hasKey("other")
                    ? summary.getDouble("other")
                    : 0;

            double totalReceived = summary.hasKey("totalReceived")
                    ? summary.getDouble("totalReceived")
                    : 0;

            sunmiPrinterService.setFontSize(26, null);

            sunmiPrinterService.printText(
                    twoColumn(
                            "CASH:",
                            formatMoneyNoDecimal(cash),
                            42
                    ),
                    null
            );

            sunmiPrinterService.printText(
                    twoColumn(
                            "UPI:",
                            formatMoneyNoDecimal(upi),
                            42
                    ),
                    null
            );

            sunmiPrinterService.printText(
                    twoColumn(
                            "CARD:",
                            formatMoneyNoDecimal(card),
                            42
                    ),
                    null
            );

            if (other != 0) {
                sunmiPrinterService.printText(
                        twoColumn(
                                "OTHER:",
                                formatMoneyNoDecimal(other),
                                42
                        ),
                        null
                );
            }

            sunmiPrinterService.printText(
                    repeat('-', WIDTH) + "\n",
                    null
            );

            sunmiPrinterService.setFontSize(30, null);

            sunmiPrinterService.printText(
                    twoColumn(
                            "TOTAL RECEIVED:",
                            formatMoneyNoDecimal(totalReceived),
                            38
                    ),
                    null
            );

            // ------------------------------------------
            // END
            // ------------------------------------------

            sunmiPrinterService.setFontSize(24, null);

            sunmiPrinterService.printText(
                    "\n\n\n",
                    null
            );

            sunmiPrinterService.lineWrap(4, null);

            Log.d(
                    "SunmiPrinter",
                    "DAILY PAYMENT SUMMARY PRINTED"
            );

            promise.resolve("Daily payment summary printed");

        } catch (Exception e) {

            Log.e(
                    "SunmiPrinter",
                    "Daily payment summary print failed",
                    e
            );

            promise.reject(
                    "DAILY_PAYMENT_SUMMARY_PRINT_ERROR",
                    e.getMessage()
            );
        }
    }


// ==================================================
// CUSTOMER LEDGER - CALCULATOR MODE - 80MM
// ==================================================

@ReactMethod
public void printCustomerLedger(
        ReadableMap ledger,
        Promise promise
) {

    if (!checkPrinter(promise)) {
        return;
    }

    try {
        Log.d("SunmiPrinter", "========== CUSTOMER LEDGER PRINT ==========");

        sunmiPrinterService.printerInit(null);

        final int WIDTH = 48;

        // ------------------------------------------
        // CUSTOMER DETAILS
        // ------------------------------------------

        ReadableMap customer = ledger.hasKey("customer")
                && !ledger.isNull("customer")
                ? ledger.getMap("customer")
                : null;

        String customerName = "Customer";
        String company = "";
        String phone = "";

        if (customer != null) {
            if (customer.hasKey("name") && !customer.isNull("name")) {
                customerName = customer.getString("name");
            }

            if (customer.hasKey("company") && !customer.isNull("company")) {
                company = customer.getString("company");
            }

            if (customer.hasKey("phone") && !customer.isNull("phone")) {
                phone = customer.getString("phone");
            }
        }

        String period = ledger.hasKey("period")
                && !ledger.isNull("period")
                ? ledger.getString("period")
                : "All dates";

        sunmiPrinterService.setAlignment(1, null);
        sunmiPrinterService.setFontSize(30, null);
        sunmiPrinterService.printText("CUSTOMER LEDGER\n", null);

        sunmiPrinterService.setFontSize(24, null);
        sunmiPrinterService.printText(customerName + "\n", null);

        if (!company.isEmpty()) {
            sunmiPrinterService.printText(company + "\n", null);
        }

        if (!phone.isEmpty()) {
            sunmiPrinterService.printText(phone + "\n", null);
        }

        sunmiPrinterService.printText(period + "\n", null);

        sunmiPrinterService.setAlignment(0, null);
        sunmiPrinterService.printText(
                repeat('-', WIDTH) + "\n",
                null
        );

        // ------------------------------------------
        // OPENING BALANCE
        // ------------------------------------------

        double openingBalance = ledger.hasKey("openingBalance")
                ? ledger.getDouble("openingBalance")
                : 0;

        sunmiPrinterService.printText(
                twoColumn(
                        "OPENING BALANCE:",
                        formatMoneyNoDecimal(openingBalance),
                        WIDTH
                ),
                null
        );

        sunmiPrinterService.printText(
                repeat('-', WIDTH) + "\n",
                null
        );

        // ------------------------------------------
        // TRANSACTION HEADER
        // DATE | QTY X RATE | AMOUNT
        // ------------------------------------------
// Consistent 48-character layout for 80mm paper
// DATE = 12 | QTY X RATE = 22 | AMOUNT = 14

int[] cols = {12, 22, 14};

int[] aligns = {
        0, 
        0,  
        2  
};

        sunmiPrinterService.printColumnsString(
                new String[]{"DATE", "QTY X RATE", "AMOUNT"},
                cols,
                aligns,
                null
        );

        sunmiPrinterService.printText(
                repeat('-', WIDTH) + "\n",
                null
        );

        // ------------------------------------------
        // TRANSACTIONS
        // ------------------------------------------

        ReadableArray rows = ledger.hasKey("rows")
                && !ledger.isNull("rows")
                ? ledger.getArray("rows")
                : null;

        if (rows != null) {

            for (int i = 0; i < rows.size(); i++) {

                ReadableMap row = rows.getMap(i);

                if (row == null) continue;

                String date = row.hasKey("date") && !row.isNull("date")
                        ? row.getString("date")
                        : "";

                String kind = row.hasKey("kind") && !row.isNull("kind")
                        ? row.getString("kind")
                        : "";

                String title = row.hasKey("title") && !row.isNull("title")
                        ? row.getString("title")
                        : "";

                String note = row.hasKey("note") && !row.isNull("note")
                        ? row.getString("note")
                        : "";

                double amount = row.hasKey("amount")
                        ? row.getDouble("amount")
                        : 0;

                // INVOICE: print calculator quantity x rate lines.
                if ("invoice".equalsIgnoreCase(kind)) {

                    ReadableArray lines = row.hasKey("lines")
                            && !row.isNull("lines")
                            ? row.getArray("lines")
                            : null;

                    if (lines != null) {

                        for (int j = 0; j < lines.size(); j++) {

                            ReadableMap line = lines.getMap(j);

                            if (line == null) continue;

                            double qty = line.hasKey("qty")
                                    ? line.getDouble("qty")
                                    : 0;

                            double rate = line.hasKey("rate")
                                    ? line.getDouble("rate")
                                    : 0;

                            double lineAmount = line.hasKey("amount")
                                    ? line.getDouble("amount")
                                    : qty * rate;

                            sunmiPrinterService.printColumnsString(
                                    new String[]{
                                            date,
                                            formatQty(qty) + " X " +
                                                    formatMoneyNoDecimal(rate),
                                            formatMoneyNoDecimal(lineAmount)
                                    },
                                    cols,
                                    aligns,
                                    null
                            );

                            date = "";
                        }
                    }

                } else {

                    // PAYMENT / RETURN
                    String transactionName =
                            "payment".equalsIgnoreCase(kind)
                                    ? "PAYMENT"
                                    : "return".equalsIgnoreCase(kind)
                                    ? "RETURN"
                                    : title;

                    String detail = transactionName;

                    if (!note.isEmpty()) {
                        detail += " " + note;
                    }

                    if (detail.length() > 26) {
                        detail = detail.substring(0, 26);
                    }

                    sunmiPrinterService.printColumnsString(
                            new String[]{
                                    date,
                                    detail,
                                    formatMoneyNoDecimal(amount)
                            },
                            cols,
                            aligns,
                            null
                    );
                }
            }
        }

        // ------------------------------------------
        // TOTALS
        // ------------------------------------------

        sunmiPrinterService.printText(
                repeat('-', WIDTH) + "\n",
                null
        );

        double totalInvoiced = ledger.hasKey("totalInvoiced")
                ? ledger.getDouble("totalInvoiced")
                : 0;

        double totalReceived = ledger.hasKey("totalReceived")
                ? ledger.getDouble("totalReceived")
                : 0;

        double outstanding = ledger.hasKey("outstanding")
                ? ledger.getDouble("outstanding")
                : 0;

        sunmiPrinterService.setFontSize(26, null);

        sunmiPrinterService.printText(
                twoColumn(
                        "TOTAL INVOICED:",
                        formatMoneyNoDecimal(totalInvoiced) ,
                        42
                ),
                null
        );

        sunmiPrinterService.printText(
                twoColumn(
                        "TOTAL RECEIVED:",
                        formatMoneyNoDecimal(totalReceived) ,
                        42
                ),
                null
        );

        sunmiPrinterService.setFontSize(30, null);

        sunmiPrinterService.printText(
                twoColumn(
                        "OUTSTANDING:",
                        formatMoneyNoDecimal(outstanding) ,
                        38
                ),
                null
        );

        sunmiPrinterService.setFontSize(24, null);
        sunmiPrinterService.printText("\n\n\n", null);
        sunmiPrinterService.lineWrap(4, null);

        Log.d("SunmiPrinter", "CUSTOMER LEDGER PRINTED");

        promise.resolve("Customer ledger printed");

    } catch (Exception e) {

        Log.e(
                "SunmiPrinter",
                "Customer ledger print failed",
                e
        );

        promise.reject(
                "CUSTOMER_LEDGER_PRINT_ERROR",
                e.getMessage()
        );
    }
}


    // ==================================================
    // CHECK LABEL MODE
    // ==================================================

    @ReactMethod
    public void isLabelMode(
            Promise promise
    ) {

        if (!checkPrinter(promise)) {
            return;
        }

        try {

            int mode =
                    sunmiPrinterService.getPrinterMode();

            Log.d(
                    "SunmiPrinter",
                    "Printer mode = " + mode
            );

            /*
             * SUNMI:
             *
             * 1 = Black mark mode
             * 2 = Label mode
             */

            promise.resolve(
                    mode == 2
            );

        } catch (Exception e) {

            Log.e(
                    "SunmiPrinter",
                    "Unable to get printer mode",
                    e
            );

            promise.reject(
                    "MODE_ERROR",
                    e.getMessage()
            );
        }
    }


    // ==================================================
    // GET PRINTER MODE
    // ==================================================

    @ReactMethod
    public void getPrinterMode(
            Promise promise
    ) {

        if (!checkPrinter(promise)) {
            return;
        }

        try {

            int mode =
                    sunmiPrinterService.getPrinterMode();

            Log.d(
                    "SunmiPrinter",
                    "Printer mode = " + mode
            );

            promise.resolve(mode);

        } catch (Exception e) {

            Log.e(
                    "SunmiPrinter",
                    "Unable to get printer mode",
                    e
            );

            promise.reject(
                    "MODE_ERROR",
                    e.getMessage()
            );
        }
    }


 // ==================================================
// PRINT BARCODE LABELS USING LABEL ENGINE
// ==================================================

@ReactMethod
public void printBarcodeLabels(
        ReadableArray labels,
        Promise promise
) {

    if (!checkPrinter(promise)) {
        return;
    }

    try {

        if (labels == null || labels.size() == 0) {

            promise.reject(
                    "NO_LABELS",
                    "No barcode labels supplied"
            );

            return;
        }

        Log.d(
                "SunmiPrinter",
                "========== BARCODE LABEL PRINT =========="
        );

        Log.d(
                "SunmiPrinter",
                "LABEL COUNT = " + labels.size()
        );

        int printedCount = 0;

        // ==========================================
        // PRINT EACH LABEL
        // ==========================================

        for (int i = 0; i < labels.size(); i++) {

            ReadableMap product =
                    labels.getMap(i);

            if (product == null) {
                continue;
            }

            // --------------------------------------
            // READ VALUES FOR LOGGING
            // --------------------------------------

            String name = "";

            if (
                    product.hasKey("name") &&
                    !product.isNull("name")
            ) {

                name =
                        product.getString("name");
            }

            String barcode = "";

            if (
                    product.hasKey("barcode") &&
                    !product.isNull("barcode")
            ) {

                barcode =
                        product.getString("barcode");
            }

            Log.d(
                    "SunmiPrinter",
                    "LABEL " + (i + 1) +
                            " NAME = " + name
            );

            Log.d(
                    "SunmiPrinter",
                    "LABEL " + (i + 1) +
                            " BARCODE = " + barcode
            );

            // --------------------------------------
            // VALIDATE
            // --------------------------------------

            if (
                    barcode == null ||
                    barcode.trim().isEmpty()
            ) {

                Log.w(
                        "SunmiPrinter",
                        "Skipping label without barcode"
                );

                continue;
            }

            // ======================================
            // CREATE COMPLETE LABEL BITMAP
            // ======================================

            android.graphics.Bitmap labelBitmap =
                    LabelEngine.createLabel(product);

            if (labelBitmap == null) {

                Log.w(
                        "SunmiPrinter",
                        "LabelEngine returned null bitmap"
                );

                continue;
            }

            Log.d(
                    "SunmiPrinter",
                    "Bitmap created: " +
                            labelBitmap.getWidth() +
                            "x" +
                            labelBitmap.getHeight()
            );

            // ======================================
            // START LABEL
            // ======================================

            sunmiPrinterService.labelLocate();

            // ======================================
            // PRINT BITMAP
            // ======================================

            sunmiPrinterService.printBitmap(
                    labelBitmap,
                    null
            );

            // ======================================
            // CLEANUP BITMAP
            // ======================================

            labelBitmap.recycle();

            printedCount++;
        }

        // ==========================================
        // OUTPUT / CUT LABEL
        // ==========================================

        if (printedCount > 0) {

            sunmiPrinterService.labelOutput();
        }

        Log.d(
                "SunmiPrinter",
                "LABEL PRINT COMPLETE: " +
                        printedCount
        );

        promise.resolve(
                "Printed " +
                        printedCount +
                        " labels"
        );

    } catch (Exception e) {

        Log.e(
                "SunmiPrinter",
                "Barcode label print failed",
                e
        );

        promise.reject(
                "BARCODE_PRINT_ERROR",
                e.getMessage()
        );
    }
}

    // ==================================================
    // CHECK IF DEVICE IS SUNMI
    // ==================================================

    @ReactMethod
    public void isSunmiDevice(Promise promise) {

        try {

            String manufacturer =
                    android.os.Build.MANUFACTURER;

            String model =
                    android.os.Build.MODEL;

            boolean isSunmi =
                    manufacturer
                            .toLowerCase()
                            .contains("sunmi")
                    ||
                    model
                            .toLowerCase()
                            .contains("sunmi");

            Log.d(
                    "SunmiPrinter",
                    "MANUFACTURER = " + manufacturer
            );

            Log.d(
                    "SunmiPrinter",
                    "MODEL = " + model
            );

            Log.d(
                    "SunmiPrinter",
                    "IS SUNMI = " + isSunmi
            );

            promise.resolve(isSunmi);

        } catch (Exception e) {

            Log.e(
                    "SunmiPrinter",
                    "SUNMI DEVICE CHECK ERROR",
                    e
            );

            promise.resolve(false);
        }
    }

private String formatQty(double value) {

    if (value == Math.floor(value)) {
        return String.valueOf((long) value);
    }

    return String.format(
            Locale.US,
            "%.2f",
            value
    );
}

private String formatMoneyNoDecimal(double value) {

    if (value == Math.floor(value)) {
        return String.valueOf((long) value);
    }

    return String.format(
            Locale.US,
            "%.2f",
            value
    );
}
private String twoColumn(
        String left,
        String right,
        int width
) {

    int spaces =
            width -
            left.length() -
            right.length();

    return left +
            " ".repeat(
                    Math.max(1, spaces)
            ) +
            right +
            "\n";
}

private String repeat(
        char character,
        int count
) {

    StringBuilder builder =
            new StringBuilder();

    for (int i = 0; i < count; i++) {
        builder.append(character);
    }

    return builder.toString();
}



        }
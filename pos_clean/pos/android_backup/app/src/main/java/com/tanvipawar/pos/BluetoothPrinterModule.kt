package com.tanvipawar.pos;

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log

import com.facebook.react.bridge.*

import java.io.IOException
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

import org.json.JSONObject

class BluetoothPrinterModule(
    reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "BluetoothPrinter"

        private const val SPP_UUID =
            "00001101-0000-1000-8000-00805F9B34FB"

        // 58mm thermal printer
        // Approx. 32 characters per line
        private const val RECEIPT_WIDTH = 32
    }

    private var bluetoothSocket: BluetoothSocket? = null

    override fun getName(): String {
        return "BluetoothPrinter"
    }

    // ============================================================
    // BLUETOOTH PERMISSION
    // ============================================================

    private fun hasBluetoothPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            reactApplicationContext.checkSelfPermission(
                Manifest.permission.BLUETOOTH_CONNECT
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }

    // ============================================================
    // GET PAIRED DEVICES
    // ============================================================

    @ReactMethod
    fun getPairedDevices(promise: Promise) {
        try {

            val adapter = BluetoothAdapter.getDefaultAdapter()

            if (adapter == null) {
                promise.reject(
                    "NO_BLUETOOTH",
                    "Bluetooth is not available on this device"
                )
                return
            }

            if (!hasBluetoothPermission()) {
                promise.reject(
                    "BLUETOOTH_PERMISSION",
                    "Bluetooth permission is not granted"
                )
                return
            }

            val devices = adapter.bondedDevices
            val result = Arguments.createArray()

            Log.d(
                TAG,
                "PAIRED DEVICE COUNT: ${devices.size}"
            )

            for (device in devices) {

                val item = Arguments.createMap()

                item.putString(
                    "name",
                    device.name ?: "Unknown"
                )

                item.putString(
                    "address",
                    device.address
                )

                result.pushMap(item)
            }

            promise.resolve(result)

        } catch (e: Exception) {

            Log.e(
                TAG,
                "PAIRED DEVICES ERROR",
                e
            )

            promise.reject(
                "PAIRED_DEVICES_ERROR",
                e.message ?: "Unable to get paired devices",
                e
            )
        }
    }

    // ============================================================
    // CONNECT TO PRINTER
    // ============================================================

    @ReactMethod
    fun connect(
        address: String,
        promise: Promise
    ) {

        try {

            Log.d(TAG, "====================================")
            Log.d(TAG, "BLUETOOTH PRINTER CONNECT")
            Log.d(TAG, "ADDRESS: $address")
            Log.d(TAG, "====================================")

            val adapter = BluetoothAdapter.getDefaultAdapter()

            if (adapter == null) {
                promise.reject(
                    "NO_BLUETOOTH",
                    "Bluetooth is not available"
                )
                return
            }

            if (!hasBluetoothPermission()) {
                promise.reject(
                    "BLUETOOTH_PERMISSION",
                    "Bluetooth permission is not granted"
                )
                return
            }

            val device: BluetoothDevice =
                adapter.getRemoteDevice(address)

            Log.d(
                TAG,
                "DEVICE NAME: ${device.name}"
            )

            Log.d(
                TAG,
                "DEVICE ADDRESS: ${device.address}"
            )

            // Close previous connection
            try {
                bluetoothSocket?.close()
            } catch (_: Exception) {
            }

            bluetoothSocket = null

            // Stop discovery
            try {
                adapter.cancelDiscovery()
            } catch (_: Exception) {
            }

            val uuid = UUID.fromString(SPP_UUID)

            // ====================================================
            // SECURE RFCOMM
            // ====================================================

            try {

                Log.d(
                    TAG,
                    "TRYING SECURE RFCOMM"
                )

                val socket =
                    device.createRfcommSocketToServiceRecord(uuid)

                socket.connect()

                if (socket.isConnected) {

                    bluetoothSocket = socket

                    Log.d(
                        TAG,
                        "SECURE RFCOMM CONNECTED"
                    )

                    promise.resolve(
                        "CONNECTED_SECURE"
                    )

                    return
                }

            } catch (e: Exception) {

                Log.e(
                    TAG,
                    "SECURE RFCOMM FAILED",
                    e
                )
            }

            // ====================================================
            // INSECURE RFCOMM
            // ====================================================

            try {

                Log.d(
                    TAG,
                    "TRYING INSECURE RFCOMM"
                )

                val socket =
                    device.createInsecureRfcommSocketToServiceRecord(
                        uuid
                    )

                socket.connect()

                if (socket.isConnected) {

                    bluetoothSocket = socket

                    Log.d(
                        TAG,
                        "INSECURE RFCOMM CONNECTED"
                    )

                    promise.resolve(
                        "CONNECTED_INSECURE"
                    )

                    return
                }

            } catch (e: Exception) {

                Log.e(
                    TAG,
                    "INSECURE RFCOMM FAILED",
                    e
                )
            }

            bluetoothSocket = null

            promise.reject(
                "BLUETOOTH_CONNECT_ERROR",
                "Unable to connect to printer using secure or insecure RFCOMM"
            )

        } catch (e: Exception) {

            Log.e(
                TAG,
                "BLUETOOTH CONNECT ERROR",
                e
            )

            try {
                bluetoothSocket?.close()
            } catch (_: Exception) {
            }

            bluetoothSocket = null

            promise.reject(
                "BLUETOOTH_CONNECT_ERROR",
                e.message ?: "Unable to connect to printer",
                e
            )
        }
    }

    // ============================================================
    // TEST PRINT
    // ============================================================

    @ReactMethod
    fun testPrint(promise: Promise) {

        try {

            val socket = bluetoothSocket

            if (socket == null || !socket.isConnected) {

                promise.reject(
                    "NOT_CONNECTED",
                    "Printer is not connected"
                )

                return
            }

            val output = socket.outputStream

            // Initialize
            output.write(
                byteArrayOf(
                    0x1B,
                    0x40
                )
            )

            // FIXED:
            // Use our write() helper for Strings.
            // Do not mix String + ByteArray.

            write(
                output,
                "\n\n"
            )

            write(
                output,
                center("D'LUME BOUTIQUE")
            )

            write(
                output,
                line()
            )

            write(
                output,
                center("BLUETOOTH PRINTER TEST")
            )

            write(
                output,
                line()
            )

            write(
                output,
                center("CONNECTION SUCCESSFUL!")
            )

            write(
                output,
                "\n\n\n\n"
            )

            output.flush()

            promise.resolve("PRINTED")

        } catch (e: Exception) {

            Log.e(
                TAG,
                "TEST PRINT ERROR",
                e
            )

            promise.reject(
                "PRINT_ERROR",
                e.message ?: "Unable to print",
                e
            )
        }
    }

    // ============================================================
    // REAL 58MM RECEIPT
    // ============================================================

    @ReactMethod
    fun printReceipt(
        receiptJson: String,
        promise: Promise
    ) {

        try {

            Log.d(TAG, "====================================")
            Log.d(TAG, "58MM RECEIPT PRINT")
            Log.d(TAG, receiptJson)
            Log.d(TAG, "====================================")

            val socket = bluetoothSocket

            if (socket == null || !socket.isConnected) {

                promise.reject(
                    "NOT_CONNECTED",
                    "Printer is not connected"
                )

                return
            }

            val output = socket.outputStream

            // ====================================================
            // INITIALIZE
            // ====================================================

            output.write(
                byteArrayOf(
                    0x1B,
                    0x40
                )
            )

            // ====================================================
            // RECEIPT JSON
            // ====================================================

            val json = JSONObject(receiptJson)

          val orderNo =
    json.optString(
        "invoiceNo",
        json.optString("order_no", "-")
    )

val customerName =
    json.optString(
        "customerName",
        json.optString("customer_name", "-")
    )

val paymentMode =
    json.optString(
        "paymentMode",
        json.optString("payment_mode", "Cash")
    )

val subtotal =
    json.optDouble(
        "subtotal",
        0.0
    )

val discount =
    json.optDouble(
        "totalDiscount",
        json.optDouble("discount", 0.0)
    )

val total =
    json.optDouble(
        "grandTotal",
        json.optDouble("total", 0.0)
    )

val paidAmount =
    json.optDouble(
        "amountReceived",
        json.optDouble("paid_amount", total)
    )

val orderDate =
    json.optString(
        "invoiceDate",
        json.optString("order_date", "")
    )

            // ====================================================
            // DATE
            // ====================================================

            val formattedDate =
                formatReceiptDate(orderDate)

            // ====================================================
            // RECEIPT TOP
            // ====================================================

            write(
                output,
                "\n"
            )


// ====================================================
// COMPANY HEADER
// ====================================================

val companyName =
    json.optString(
        "companyName",
        ""
    )

val companyAddress =
    json.optString(
        "companyAddress",
        ""
    )

val companyPhone =
    json.optString(
        "companyPhone",
        ""
    )

val companyEmail =
    json.optString(
        "companyEmail",
        ""
    )

// Company name
if (companyName.isNotBlank()) {
    write(
        output,
        center(companyName)
    )
}

// Full address
if (companyAddress.isNotBlank()) {

    val addressParts =
        companyAddress
            .split(",")
            .map { it.trim() }
            .filter { it.isNotBlank() }

    for (addressPart in addressParts) {

        write(
            output,
            center(addressPart)
        )
    }
}

// Mobile
if (companyPhone.isNotBlank()) {

    write(
        output,
        center("Ph: $companyPhone")
    )
}

// Email
if (companyEmail.isNotBlank()) {

    write(
        output,
        center(companyEmail)
    )
}

write(
    output,
    line()
)


            // ====================================================
            // INVOICE INFORMATION
            // ====================================================

            write(
                output,
                twoColumn(
                    "Invoice:",
                    orderNo
                )
            )

            write(
                output,
                twoColumn(
                    "Date:",
                    formattedDate
                )
            )

          

            if (
                customerName.isNotBlank() &&
                customerName != "-"
            ) {

                write(
                    output,
                    twoColumn(
                        "Customer:",
                        customerName
                    )
                )
            }

            write(
                output,
                line()
            )

            // ====================================================
            // ITEM HEADER
            // ====================================================

            write(
                output,
                itemHeader()
            )

            write(
                output,
                line()
            )

            // ====================================================
            // ITEMS
            // ====================================================

            val items =
                json.optJSONArray("items")

            if (items != null) {

                for (i in 0 until items.length()) {

                    val item =
                        items.getJSONObject(i)

                    val name =
                        item.optString(
                            "name",
                            "Item"
                        )

               val quantity =
    item.optDouble(
        "qty",
        item.optDouble("quantity", 1.0)
    )

                    val price =
                        item.optDouble(
                            "price",
                            0.0
                        )

                    val amount =
                        item.optDouble(
                            "amount",
                            price * quantity
                        )

                    writeItem(
                        output,
                        name,
                        quantity,
                        price,
                        amount
                    )
                }
            }

            // ====================================================
            // TOTAL SECTION
            // ====================================================

            write(
                output,
                line()
            )

            write(
                output,
                totalRow(
                    "Subtotal",
                    subtotal
                )
            )

            if (discount > 0) {

                write(
                    output,
                    totalRow(
                        "Discount",
                        discount
                    )
                )
            }

            // ====================================================
            // TOTAL - BOLD
            // ====================================================

            write(
                output,
                "\n"
            )

            // ESC E 1 = bold ON
            output.write(
                byteArrayOf(
                    0x1B,
                    0x45,
                    0x01
                )
            )

            write(
                output,
                totalRow(
                    "TOTAL",
                    total
                )
            )

            // ESC E 0 = bold OFF
            output.write(
                byteArrayOf(
                    0x1B,
                    0x45,
                    0x00
                )
            )

            write(
                output,
                line()
            )

            // ====================================================
            // PAYMENT
            // ====================================================

            write(
                output,
                totalRow(
                    "Paid ($paymentMode)",
                    paidAmount
                )
            )

            write(
                output,
                line()
            )

            // ====================================================
            // FOOTER
            // ====================================================

            write(
                output,
                "\n"
            )

            write(
                output,
                center(
                    "Thank you for shopping"
                )
            )

            write(
                output,
                center(
                    "with us!"
                )
            )

            write(
                output,
                center(
                    "Please visit again"
                )
            )

            write(
                output,
                "\n"
            )

            write(
                output,
                line()
            )

            write(
                output,
                center(
                    "Powered by D'LumeBiz POS"
                )
            )

            write(
                output,
                "\n\n\n"
            )

            output.flush()

            Log.d(
                TAG,
                "===================================="
            )

            Log.d(
                TAG,
                "58MM RECEIPT PRINTED SUCCESSFULLY"
            )

            Log.d(
                TAG,
                "===================================="
            )

            promise.resolve(
                "PRINTED"
            )

        } catch (e: Exception) {

            Log.e(
                TAG,
                "58MM RECEIPT PRINT ERROR",
                e
            )

            promise.reject(
                "PRINT_ERROR",
                e.message ?: "Unable to print receipt",
                e
            )
        }
    }

    // ============================================================
// DAILY SALES SUMMARY
// ============================================================

@ReactMethod
fun printDailySalesSummary(
    summaryJson: String,
    promise: Promise
) {

    try {

        Log.d(
            TAG,
            "===================================="
        )
        Log.d(
            TAG,
            "DAILY SALES SUMMARY PRINT"
        )
        Log.d(
            TAG,
            summaryJson
        )
        Log.d(
            TAG,
            "===================================="
        )

        val socket = bluetoothSocket

        if (socket == null || !socket.isConnected) {

            promise.reject(
                "NOT_CONNECTED",
                "Printer is not connected"
            )

            return
        }

        val output = socket.outputStream

        // ====================================================
        // INITIALIZE PRINTER
        // ====================================================

        output.write(
            byteArrayOf(
                0x1B,
                0x40
            )
        )

        val json = JSONObject(summaryJson)

        val date = json.optString(
            "date",
            ""
        )

        val totalItems = json.optDouble(
            "totalItems",
            0.0
        )

        val totalSales = json.optDouble(
            "totalSales",
            0.0
        )

        // ====================================================
        // HEADER
        // ====================================================

        write(
            output,
            "\n"
        )

        output.write(
            byteArrayOf(
                0x1B,
                0x45,
                0x01
            )
        )

        write(
            output,
            center("DAILY SALES SUMMARY")
        )

        output.write(
            byteArrayOf(
                0x1B,
                0x45,
                0x00
            )
        )

        write(
            output,
            center(formatSummaryDate(date))
        )

        write(
            output,
            line()
        )

// ====================================================
// ITEM TABLE HEADER
// ====================================================

write(
    output,
    String.format(
        Locale.US,
        "%-14s%4s%7s%7s\n",
        "ITEM",
        "QTY",
        "RATE",
        "AMT"
    )
)

write(
    output,
    "--------------------------------\n"
)



     val items = json.optJSONArray("items")

if (items != null) {

    for (i in 0 until items.length()) {

        val item = items.getJSONObject(i)

        val name = item.optString(
            "name",
            "Item"
        )

        val qty = item.optDouble(
            "qty",
            0.0
        )

        val rate = item.optDouble(
            "rate",
            0.0
        )

        val amount = item.optDouble(
            "amount",
            qty * rate
        )

        val row =
            String.format(
                Locale.US,
                "%-14s%4s%7s%7s\n",
                name.take(14),
                formatQty(qty),
                formatMoneyNoDecimal(rate),
                formatMoneyNoDecimal(amount)
            )

        write(
            output,
            row
        )
    }
}

// ====================================================
// TOTALS
// ====================================================

write(
    output,
    line()
)

output.write(
    byteArrayOf(
        0x1B,
        0x45,
        0x01
    )
)

val totalRow =
    String.format(
        Locale.US,
        "%-14s%4s%7s%7s\n",
        "TOTAL",
        formatQty(totalItems),
        "",
        formatMoneyNoDecimal(totalSales) + "Rs"
    )

write(
    output,
    totalRow
)

output.write(
    byteArrayOf(
        0x1B,
        0x45,
        0x00
    )
)

write(
    output,
    "\n\n\n"
)

output.flush()

Log.d(
    TAG,
    "DAILY SALES SUMMARY PRINTED SUCCESSFULLY"
)

promise.resolve(
    "PRINTED"
)

} catch (e: Exception) {

    Log.e(
        TAG,
        "DAILY SALES SUMMARY PRINT ERROR",
        e
    )

    promise.reject(
        "PRINT_ERROR",
        e.message ?: "Unable to print daily sales summary",
        e
    )
}
}

    // ============================================================
    // WRITE STRING TO PRINTER
    // ============================================================

    private fun write(
        output: java.io.OutputStream,
        text: String
    ) {
        output.write(
            text.toByteArray(
                Charsets.UTF_8
            )
        )
    }

    // ============================================================
    // 32 CHARACTER DIVIDER
    // ============================================================

    private fun line(): String {
        return "--------------------------------\n"
    }

    // ============================================================
    // CENTER TEXT
    // ============================================================

    private fun center(
        text: String
    ): String {

        val cleanText =
            text.take(RECEIPT_WIDTH)

        val spaces =
            (RECEIPT_WIDTH - cleanText.length) / 2

        return " ".repeat(
            maxOf(0, spaces)
        ) + cleanText + "\n"
    }

    // ============================================================
    // TWO COLUMN INFORMATION ROW
    // ============================================================

    private fun twoColumn(
        left: String,
        right: String
    ): String {

        val maxRight =
            RECEIPT_WIDTH - left.length - 1

        val safeRight =
            right.take(
                maxOf(1, maxRight)
            )

        val spaces =
            RECEIPT_WIDTH -
                left.length -
                safeRight.length

        return left +
            " ".repeat(
                maxOf(1, spaces)
            ) +
            safeRight +
            "\n"
    }

    // ============================================================
    // ITEM HEADER
    // ============================================================

    private fun itemHeader(): String {

        val itemWidth = 14
        val qtyWidth = 4
        val rateWidth = 7
        val amountWidth = 7

        return String.format(
            Locale.US,
            "%-${itemWidth}s%" +
                "${qtyWidth}s%" +
                "${rateWidth}s%" +
                "${amountWidth}s\n",
            "ITEM",
            "QTY",
            "RATE",
            "AMOUNT"
        )
    }

    // ============================================================
    // ITEM ROW
    // ============================================================

    private fun writeItem(
        output: java.io.OutputStream,
        name: String,
        quantity: Double,
        price: Double,
        amount: Double
    ) {

        val itemWidth = 14

        val qtyText =
            formatQty(quantity)

  val rateText =
    formatMoneyNoDecimal(price)

val amountText =
    formatMoneyNoDecimal(amount)

        // --------------------------------------------------------
        // Wrap product name
        // --------------------------------------------------------

        val words =
            name.trim()
                .split(" ")

        var currentLine = ""

        val nameLines =
            mutableListOf<String>()

        for (word in words) {

            if (
                currentLine.isEmpty()
            ) {

                currentLine = word

            } else if (
                currentLine.length +
                    1 +
                    word.length <=
                    itemWidth
            ) {

                currentLine +=
                    " $word"

            } else {

                nameLines.add(
                    currentLine
                )

                currentLine = word
            }
        }

        if (currentLine.isNotEmpty()) {
            nameLines.add(
                currentLine
            )
        }

        if (nameLines.isEmpty()) {
            nameLines.add("Item")
        }

        // --------------------------------------------------------
        // First line
        // --------------------------------------------------------

        val firstName =
            nameLines.first()
                .take(itemWidth)

        val row =
            String.format(
                Locale.US,
                "%-${itemWidth}s" +
                    "%4s" +
                    "%7s" +
                    "%7s\n",
                firstName,
                qtyText,
                rateText,
                amountText
            )

        write(
            output,
            row
        )

        // --------------------------------------------------------
        // Remaining wrapped lines
        // --------------------------------------------------------

        if (nameLines.size > 1) {

            for (
                index in 1 until nameLines.size
            ) {

                write(
                    output,
                    nameLines[index]
                        .take(itemWidth) +
                        "\n"
                )
            }
        }
    }

    // ============================================================
    // TOTAL ROW
    // ============================================================

    private fun totalRow(
        label: String,
        value: Double
    ): String {

        val valueText =
            formatMoney(value)

        val spaces =
            RECEIPT_WIDTH -
                label.length -
                valueText.length

        return label +
            " ".repeat(
                maxOf(1, spaces)
            ) +
            valueText +
            "\n"
    }

    // ============================================================
    // MONEY
    // ============================================================

    private fun formatMoney(
        value: Double
    ): String {

        return String.format(
            Locale.US,
            "%.2f",
            value
        )
    }


private fun formatMoneyNoDecimal(
    value: Double
): String {

    return if (value % 1.0 == 0.0) {
        value.toLong().toString()
    } else {
        String.format(
            Locale.US,
            "%.2f",
            value
        )
    }
}




private fun formatSummaryDate(
    date: String
): String {

    if (date.isBlank()) {
        return "-"
    }

    return try {

        val inputFormat =
            SimpleDateFormat(
                "yyyy-MM-dd",
                Locale.US
            )

        val parsed =
            inputFormat.parse(date)

        val outputFormat =
            SimpleDateFormat(
                "dd/MM/yyyy",
                Locale.US
            )

        outputFormat.format(
            parsed ?: Date()
        )

    } catch (_: Exception) {

        date
    }
}



    // ============================================================
    // QUANTITY
    // ============================================================

    private fun formatQty(
        value: Double
    ): String {

        return if (
            value % 1.0 == 0.0
        ) {

            value.toInt().toString()

        } else {

            String.format(
                Locale.US,
                "%.2f",
                value
            )
        }
    }

    // ============================================================
    // DATE
    // ============================================================

    private fun formatReceiptDate(
        isoDate: String
    ): String {

        if (isoDate.isBlank()) {
            return "-"
        }

        return try {

            val inputFormat =
                SimpleDateFormat(
                    "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
                    Locale.US
                )

            inputFormat.timeZone =
                java.util.TimeZone.getTimeZone(
                    "UTC"
                )

            val date =
                inputFormat.parse(
                    isoDate
                )

            val outputFormat =
                SimpleDateFormat(
                    "dd/MM/yyyy HH:mm",
                    Locale.US
                )

            outputFormat.format(
                date ?: Date()
            )

        } catch (_: Exception) {

            isoDate
                .replace("T", " ")
                .take(16)
        }
    }

    // ============================================================
    // DISCONNECT
    // ============================================================

    @ReactMethod
    fun disconnect(
        promise: Promise
    ) {

        try {

            bluetoothSocket?.close()
            bluetoothSocket = null

            promise.resolve(
                "DISCONNECTED"
            )

        } catch (e: IOException) {

            bluetoothSocket = null

            promise.reject(
                "DISCONNECT_ERROR",
                e.message,
                e
            )
        }
    }
}
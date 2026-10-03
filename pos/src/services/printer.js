// services/printer.js

import { NativeModules } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { SunmiPrinter, BluetoothPrinter } = NativeModules;

const PRINTER_STORAGE_KEY = "@dlume_selected_printer";

let isSunmi = null;
let sunmiConnecting = null;
let bluetoothAddress = null;


// ======================================================
// DETECT SUNMI DEVICE
// ======================================================

const checkIsSunmiDevice = async () => {

  if (isSunmi !== null) {
    return isSunmi;
  }

  if (!SunmiPrinter) {
    console.log("SunmiPrinter module not available");
    isSunmi = false;
    return false;
  }

  try {

    if (typeof SunmiPrinter.isSunmiDevice !== "function") {

      console.log(
        "isSunmiDevice method not available"
      );

      // IMPORTANT:
      // Do not assume Sunmi just because the module exists.
      isSunmi = false;

      return false;
    }

    const result =
      await SunmiPrinter.isSunmiDevice();

    isSunmi = !!result;

    console.log(
      "DEVICE IS SUNMI:",
      isSunmi
    );

    return isSunmi;

  } catch (error) {

    console.log(
      "SUNMI DEVICE CHECK ERROR:",
      error
    );

    isSunmi = false;

    return false;
  }
};


// ======================================================
// ENSURE SUNMI PRINTER CONNECTED
// ======================================================

const ensureSunmiConnected = async () => {

  if (!SunmiPrinter) {
    throw new Error(
      "SunmiPrinter native module is not available"
    );
  }

  if (!sunmiConnecting) {

    sunmiConnecting =
      SunmiPrinter
        .connectPrinter()
        .then((res) => {

          console.log(
            "SUNMI PRINTER CONNECTED:",
            res
          );

          return res;
        })
        .catch((err) => {

          sunmiConnecting = null;

          throw err;
        });
  }

  return sunmiConnecting;
};


// ======================================================
// BLUETOOTH PRINTER ADDRESS
// ======================================================

export const setBluetoothPrinter = async (address) => {

  if (!BluetoothPrinter) {

    throw new Error(
      "BluetoothPrinter native module is not available"
    );
  }

  if (!address) {

    throw new Error(
      "Bluetooth printer address is required"
    );
  }

  console.log(
    "CONNECTING BLUETOOTH PRINTER:",
    address
  );

  const result =
    await BluetoothPrinter.connect(address);

  bluetoothAddress = address;

  console.log(
    "BLUETOOTH PRINTER CONNECTED:",
    result
  );

  return {
    success: true,
    result,
  };
};


// ======================================================
// GET BLUETOOTH PRINTERS
// ======================================================

export const getBluetoothPrinters = async () => {

  if (!BluetoothPrinter) {

    throw new Error(
      "BluetoothPrinter native module is not available"
    );
  }

  const devices =
    await BluetoothPrinter.getPairedDevices();

  console.log(
    "BLUETOOTH PAIRED DEVICES:",
    devices
  );

  return devices;
};


// ======================================================
// ENSURE BLUETOOTH PRINTER CONNECTED
// ======================================================

const ensureBluetoothConnected = async () => {

  if (!BluetoothPrinter) {
    throw new Error(
      "BluetoothPrinter native module is not available"
    );
  }

  // Restore selected printer after app reload
  if (!bluetoothAddress) {

    const storedPrinter =
      await AsyncStorage.getItem(
        PRINTER_STORAGE_KEY
      );

    if (storedPrinter) {

      try {

        const printer =
          JSON.parse(storedPrinter);

        if (printer?.address) {

          bluetoothAddress =
            printer.address;

          console.log(
            "RESTORED BLUETOOTH PRINTER:",
            printer
          );
        }

      } catch (error) {

        console.log(
          "FAILED TO RESTORE BLUETOOTH PRINTER:",
          error
        );
      }
    }
  }

  if (!bluetoothAddress) {

    throw new Error(
      "No Bluetooth printer selected. Please select a printer first."
    );
  }

  const result =
    await BluetoothPrinter.connect(
      bluetoothAddress
    );

  console.log(
    "BLUETOOTH PRINTER READY:",
    result
  );

  return result;
};


// ======================================================
// RECEIPT
// ======================================================

export const printReceipt = async (receipt) => {

  try {

    console.log(
      "========== PRINT RECEIPT =========="
    );

    console.log(
      "Receipt:",
      receipt
    );

    console.log(
      "==================================="
    );


    // ==================================================
    // DETERMINE DEVICE
    // ==================================================

    const useSunmi =
      await checkIsSunmiDevice();

    console.log(
      "PRINT DEVICE:",
      useSunmi
        ? "SUNMI"
        : "BLUETOOTH TABLET"
    );


    // ==================================================
    // SUNMI
    // ==================================================

    if (useSunmi) {

      await ensureSunmiConnected();

      const result =
        await SunmiPrinter.printReceipt(
          receipt
        );

      console.log(
        "SUNMI PRINT RESULT:",
        result
      );

      return {
        success: true,
        printer: "sunmi",
        result,
      };
    }


    // ==================================================
    // BLUETOOTH TABLET
    // ==================================================

    await ensureBluetoothConnected();


    // Your Bluetooth native module expects
    // a JSON STRING, not a JS object.

const bluetoothReceipt = {
  ...receipt,

  items: Array.isArray(receipt?.items)
    ? receipt.items.map((item) => ({
        ...item,

        name: item?.isCalculatorItem
          ? String(item?.name || "Item")
              .replace(/^Item\s*\(/i, "")
              .replace(/\)\s*$/, "")
              .replace(/₹\s*/g, "")
              .replace(/×/g, "X")
              .trim() + "Rs"
          : String(
              item?.product_name ||
              item?.name ||
              item?.product ||
              "Item"
            ).trim(),
      }))
    : [],
};

const receiptJson =
  JSON.stringify(bluetoothReceipt);


    const result =
      await BluetoothPrinter.printReceipt(
        receiptJson
      );


    console.log(
      "BLUETOOTH PRINT RESULT:",
      result
    );


    return {
      success: true,
      printer: "bluetooth",
      result,
    };

  } catch (error) {

    console.log(
      "PRINT ERROR:",
      error?.message || error
    );

    return {
      success: false,
      error,
    };
  }
};



// ======================================================
// DAILY SALES SUMMARY
// ======================================================

export const printDailySalesSummary = async (summary) => {
  try {
    console.log(
      "========== PRINT DAILY SALES SUMMARY =========="
    );

    console.log("SUMMARY:", summary);

    // ==================================================
    // NORMALIZE ITEMS
    // Same item-name logic for Sunmi + Bluetooth
    // ==================================================

    const normalizedSummary = {
      ...summary,

      items: Array.isArray(summary?.items)
        ? summary.items.map((item) => ({
            ...item,

            name: item?.isCalculatorItem
              ? String(item?.name || "Item")
                  .replace(/^Item\s*\(/i, "")
                  .replace(/\)\s*$/, "")
                  .replace(/₹\s*/g, "")
                  .replace(/×/g, "X")
                  .trim() + "Rs"
              : String(
                  item?.product_name ||
                  item?.item_name ||
                  item?.productName ||
                  item?.title ||
                  item?.name ||
                  item?.product ||
                  "Item"
                ).trim(),

            qty: Number(item?.qty || 0),
            rate: Number(item?.rate || 0),
            amount: Number(item?.amount || 0),
          }))
        : [],

      date: summary?.date || "",
    };

    console.log(
      "NORMALIZED DAILY SUMMARY:",
      normalizedSummary
    );

    // ==================================================
    // DETERMINE DEVICE
    // ==================================================

    const useSunmi = await checkIsSunmiDevice();

    console.log(
      "SUMMARY PRINT DEVICE:",
      useSunmi ? "SUNMI" : "BLUETOOTH TABLET"
    );

    // ==================================================
    // SUNMI
    // ==================================================

    if (useSunmi) {

      await ensureSunmiConnected();

      const result =
        await SunmiPrinter.printDailySalesSummary(
          normalizedSummary
        );

      console.log(
        "SUNMI DAILY SUMMARY RESULT:",
        result
      );

      return {
        success: true,
        printer: "sunmi",
        result,
      };
    }

    // ==================================================
    // BLUETOOTH PRINTER
    // ==================================================

    await ensureBluetoothConnected();

    const summaryJson =
      JSON.stringify(normalizedSummary);

    const result =
      await BluetoothPrinter.printDailySalesSummary(
        summaryJson
      );

    console.log(
      "BLUETOOTH DAILY SUMMARY RESULT:",
      result
    );

    return {
      success: true,
      printer: "bluetooth",
      result,
    };

  } catch (error) {

    console.log(
      "DAILY SALES SUMMARY PRINT ERROR:",
      error?.message || error
    );

    return {
      success: false,
      error,
    };
  }
};




// ======================================================
// DAILY PAYMENT SUMMARY
// ======================================================

export const printDailyPaymentSummary = async (summary) => {
  try {
    console.log(
      "========== PRINT DAILY PAYMENT SUMMARY =========="
    );

    console.log("PAYMENT SUMMARY:", summary);

    const useSunmi = await checkIsSunmiDevice();

    console.log(
      "PAYMENT SUMMARY PRINT DEVICE:",
      useSunmi ? "SUNMI" : "BLUETOOTH TABLET"
    );

    // ==================================================
    // SUNMI
    // ==================================================

    if (useSunmi) {
      await ensureSunmiConnected();

      const result =
        await SunmiPrinter.printDailyPaymentSummary(
          summary
        );

      return {
        success: true,
        printer: "sunmi",
        result,
      };
    }

    // ==================================================
    // BLUETOOTH
    // ==================================================

    await ensureBluetoothConnected();

    const summaryJson = JSON.stringify(summary);

    const result =
      await BluetoothPrinter.printDailyPaymentSummary(
        summaryJson
      );

    console.log(
      "BLUETOOTH DAILY PAYMENT SUMMARY RESULT:",
      result
    );

    return {
      success: true,
      printer: "bluetooth",
      result,
    };

  } catch (error) {
    console.log(
      "DAILY PAYMENT SUMMARY PRINT ERROR:",
      error?.message || error
    );

    return {
      success: false,
      error,
    };
  }
};


// ======================================================
// PRINT MULTIPLE BARCODE LABELS
// ======================================================

export const printBarcodeLabels = async (
  products
) => {

  try {

    if (!SunmiPrinter) {

      throw new Error(
        "SunmiPrinter native module is not available"
      );
    }


    // ------------------------------------------
    // VALIDATE
    // ------------------------------------------

    if (
      !Array.isArray(products) ||
      products.length === 0
    ) {

      throw new Error(
        "No products supplied for label printing"
      );
    }


    console.log(
      "========== PRINT BARCODE LABELS =========="
    );

    console.log(
      "LABEL COUNT:",
      products.length
    );

    console.log(
      "LABEL PRODUCTS:",
      products
    );

    console.log(
      "=========================================="
    );


    // ------------------------------------------
    // CONNECT
    // ------------------------------------------

    await ensureSunmiConnected();


    // ------------------------------------------
    // PRINT ALL LABELS IN ONE NATIVE CALL
    // ------------------------------------------

    const result =
      await SunmiPrinter.printBarcodeLabels(
        products
      );


    console.log(
      "BARCODE LABEL RESULT:",
      result
    );


    return {
      success: true,
      result,
    };

  } catch (error) {

    console.log(
      "BARCODE LABEL ERROR:",
      error
    );

    return {
      success: false,
      error,
    };
  }
};


// ======================================================
// OPTIONAL: PRINT ONE BARCODE LABEL
// ======================================================

export const printBarcodeLabel = async (
  product
) => {

  try {

    if (!SunmiPrinter) {

      throw new Error(
        "SunmiPrinter native module is not available"
      );
    }


    console.log(
      "PRINT SINGLE LABEL:",
      product
    );


    await ensureSunmiConnected();


    const result =
      await SunmiPrinter.printBarcodeLabel(
        product
      );


    console.log(
      "SINGLE LABEL RESULT:",
      result
    );


    return {
      success: true,
      result,
    };

  } catch (error) {

    console.log(
      "SINGLE LABEL ERROR:",
      error
    );

    return {
      success: false,
      error,
    };
  }
};


// ======================================================
// BITMAP TEST
// ======================================================

export const printBitmapTest = async () => {

  try {

    if (!SunmiPrinter) {

      throw new Error(
        "SunmiPrinter native module is not available"
      );
    }


    await ensureSunmiConnected();


    const result =
      await SunmiPrinter.printBitmapTest();


    console.log(
      "BITMAP RESULT:",
      result
    );


    return {
      success: true,
      result,
    };

  } catch (error) {

    console.log(
      "BITMAP ERROR:",
      error
    );


    return {
      success: false,
      error,
    };
  }
};



// ======================================================
// DIRECT BARCODE TEST
// ======================================================

export const printBarcodeTest = async () => {

  try {

    if (!SunmiPrinter) {
      throw new Error(
        "SunmiPrinter native module is not available"
      );
    }

    console.log(
      "========== DIRECT BARCODE TEST START =========="
    );

    await ensureSunmiConnected();

    const result =
      await SunmiPrinter.printBarcodeTest();

    console.log(
      "DIRECT BARCODE RESULT:",
      result
    );

    console.log(
      "========== DIRECT BARCODE TEST END =========="
    );

    return {
      success: true,
      result,
    };

  } catch (error) {

    console.log(
      "DIRECT BARCODE ERROR:",
      error
    );

    return {
      success: false,
      error,
    };
  }
};
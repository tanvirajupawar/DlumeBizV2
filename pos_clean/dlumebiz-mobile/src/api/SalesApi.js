
import api from "./AuthApi";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as IntentLauncher from "expo-intent-launcher";
import { Platform, Alert } from "react-native";

// Convert downloaded PDF data into Base64 for Expo FileSystem
const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  const chunkSize = 8192;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

export const fetchSales = async () => {
  try {
    const res = await api.get("/sales");

    const data = res.data?.data || [];

    const sales = data.map((e) => {
      const customer = e.customer_id || {};

      const totalAmount = Number(e.total_amount || 0);
      const paidAmount = Number(e.paid_amount || 0);
      const balance = Number(
        e.remaining_amount ?? totalAmount - paidAmount
      );

      const invoiceDate = e.invoice_date
        ? new Date(e.invoice_date)
        : null;

      const formattedDate =
        invoiceDate && !Number.isNaN(invoiceDate.getTime())
          ? `${String(invoiceDate.getDate()).padStart(2, "0")}/${String(
              invoiceDate.getMonth() + 1
            ).padStart(2, "0")}/${invoiceDate.getFullYear()}`
          : "";

      return {
        id: e._id,
        companyName:
          customer.company_name?.trim() ||
          `${customer.first_name || ""} ${
            customer.last_name || ""
          }`.trim() ||
          "Walk-in Customer",

        first_name: customer.first_name || "",
        last_name: customer.last_name || "",
        customer_id: customer._id || "",

        invoiceNo: e.invoice_no || "",
        invoice_type: e.invoice_type || "",
        date: formattedDate,

        total: totalAmount,
        paid_amount: paidAmount,
        balance,

        status: e.status || "",
        payment_method: e.payment_method || "",

        items: Array.isArray(e.items) ? e.items : [],
      };
    });

    const overallSales = [
      {
        totalAmount: sales.reduce(
          (sum, sale) => sum + sale.total,
          0
        ),
        totalPaid: sales.reduce(
          (sum, sale) => sum + sale.paid_amount,
          0
        ),
        totalBalance: sales.reduce(
          (sum, sale) => sum + sale.balance,
          0
        ),
      },
    ];

    return { sales, overallSales };
  } catch (error) {
    console.log(
      "Fetch sales error:",
      error.response?.data || error.message
    );
    throw error;
  }
};

// View / download invoice PDF
export const viewInvoice = async (id, type, no, name) => {
  try {
    const url =
      type === "Non GST"
        ? `/sale_invoice/normal/${id}`
        : `/sale_invoice/${id}`;

    const response = await api.get(url, {
      responseType: "arraybuffer",
    });

    const safeName = String(name || "Customer").replace(
      /[\\/:*?"<>|]/g,
      "_"
    );

    const safeNo = String(no || id).replace(
      /[\\/:*?"<>|]/g,
      "_"
    );

    const fileUri =
      FileSystem.documentDirectory +
      `${safeName}_${safeNo}.pdf`;

    const base64 = arrayBufferToBase64(response.data);

    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (Platform.OS === "android") {
      const contentUri =
        await FileSystem.getContentUriAsync(fileUri);

      await IntentLauncher.startActivityAsync(
        "android.intent.action.VIEW",
        {
          data: contentUri,
          flags: 1,
          type: "application/pdf",
        }
      );
    } else if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri);
    } else {
      Alert.alert(
        "Invoice",
        "Cannot open file on this device."
      );
    }
  } catch (error) {
    console.log(
      "Invoice download error:",
      error.response?.data || error.message
    );

    Alert.alert("Error", "Failed to download invoice.");
  }
};

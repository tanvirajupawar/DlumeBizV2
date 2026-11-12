
import { Alert, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as IntentLauncher from "expo-intent-launcher";

import api, { getToken } from "./AuthApi";
import VARIABLE from "../constants/variables";

// =====================================
// CUSTOMER LIST
// =====================================

export const fetchCustomers = async (
  page = 1,
  limit = 10,
  basic = false
) => {
  try {
    const companyString = await AsyncStorage.getItem("company");

    if (!companyString) {
      throw new Error("Company not found");
    }

    const company = JSON.parse(companyString);
    const cId = company?._id;

const res = await api.get("/customers");

    const data = res.data?.data || [];

    const formattedCustomers = data.map((e) => {
      const firstName = e.first_name || "";
      const lastName = e.last_name || "";

      const address = [
        e.address_line_1,
        e.address_line_2,
        e.city,
        e.state,
        e.pincode,
        e.country,
      ]
        .filter(Boolean)
        .join(", ");

      return {
        id: e._id,
        first_name: firstName,
        last_name: lastName,
        name: `${firstName} ${lastName}`.trim(),
        customer_type: e.customer_type || "",
        company_name: e.company_name || "",
        selection_name:
          e.company_name?.trim() ||
          `${firstName} ${lastName}`.trim(),
        contact_no_1: e.contact_no_1 || "",
        email: e.email || "",
        address,
        address_line_1: e.address_line_1 || "",
        address_line_2: e.address_line_2 || "",
        country: e.country || "",
        state: e.state || "",
        city: e.city || "",
        pincode: e.pincode || "",
        company_id: e.company_id || "",
        gst: e.gst || "",
        pan: e.pan || "",
        totalAmount: Number(e.totalAmount || 0),
        paidAmount: Number(e.paidAmount || 0),
        outstanding: Number(e.outstanding ?? e.pending_amount ?? 0),
        createdOn: e.createdOn || "",
        updatedOn: e.updatedOn || "",
        createdBy: e.createdBy || "",
        updatedBy: e.updatedBy || "",
      };
    });

    return {
      customers: formattedCustomers,
      total: res.data?.total || {},
      totalPages: res.data?.totalPages || 1,
      page: res.data?.page || page,
    };
  } catch (err) {
    console.log("FETCH CUSTOMERS ERROR:", err.response?.data || err.message);
    throw err;
  }
};


// =====================================
// PDF DOWNLOAD AND OPEN
// =====================================

const downloadAndOpenPdf = async (endpoint, fileName) => {
  try {
    const token = await getToken();

    // Use the same API base URL as the existing Axios instance
    const baseURL = api.defaults.baseURL?.replace(/\/+$/, "");

    if (!baseURL) {
      throw new Error("API base URL is missing");
    }

    const url = `${baseURL}${endpoint}`;

    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    console.log("REPORT DOWNLOAD URL:", url);

    const { uri, status } = await FileSystem.downloadAsync(
      url,
      fileUri,
      {
        headers: {
          Accept: "application/pdf",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );

    console.log("REPORT DOWNLOAD STATUS:", status);
    console.log("REPORT FILE URI:", uri);

    if (status < 200 || status >= 300) {
      throw new Error(`Report download failed. HTTP ${status}`);
    }

    const fileInfo = await FileSystem.getInfoAsync(uri);

    if (!fileInfo.exists || !fileInfo.size) {
      throw new Error("Downloaded report is empty");
    }

    if (Platform.OS === "android") {
      const contentUri = await FileSystem.getContentUriAsync(uri);

      await IntentLauncher.startActivityAsync(
        "android.intent.action.VIEW",
        {
          data: contentUri,
          flags: 1,
          type: "application/pdf",
        }
      );
    } else {
      const canShare = await Sharing.isAvailableAsync();

      if (!canShare) {
        throw new Error("PDF sharing is not available on this device");
      }

      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        UTI: "com.adobe.pdf",
      });
    }

    return uri;
  } catch (err) {
    console.log("PDF DOWNLOAD ERROR:", {
      message: err.message,
      status: err.response?.status,
      response: err.response?.data,
    });

    Alert.alert(
      "Report Error",
      err.message || "Failed to download or open report"
    );

    throw err;
  }
};


// =====================================
// OUTSTANDING REPORT
// =====================================


export const openOutstandingReport = async () => {
  try {
    const companyString = await AsyncStorage.getItem("company");

    if (!companyString) {
      throw new Error("Company not found");
    }

    const company = JSON.parse(companyString);
    const cId = company?._id;

    if (!cId) {
      throw new Error("Company ID not found");
    }

    const endpoint =
      `/reports/outstandingReport?id=${encodeURIComponent(cId)}`;

    await downloadAndOpenPdf(
      endpoint,
      "outstanding_report.pdf"
    );

  } catch (err) {
    console.log("OUTSTANDING REPORT ERROR:", err.message);
  }
};



// =====================================
// SALES REPORT
// =====================================

export const salesReport = async (ver_id, name, date) => {
  try {
    const endpoint =
      `/reports/sale?ver_id=${encodeURIComponent(ver_id)}` +
      `&from=${encodeURIComponent(date)}`;

    const safeName = (name || "customer")
      .replace(/f\/w/gi, "f_w")
      .replace(/[^a-zA-Z0-9]/g, "_");

    return await downloadAndOpenPdf(
      endpoint,
      `sales_report_${safeName}.pdf`
    );
  } catch (err) {
    console.log("SALES REPORT ERROR:", err.message);
  }
};

// =====================================
// RECEIPT REPORT
// =====================================

export const receiptReport = async (ver_id, name) => {
  try {
    const endpoint =
      `/reports/receipts?ver_id=${encodeURIComponent(ver_id)}`;

    const safeName = (name || "customer")
      .replace(/[^a-zA-Z0-9]/g, "_");

    return await downloadAndOpenPdf(
      endpoint,
      `receipt_report_${safeName}.pdf`
    );
  } catch (err) {
    console.log("RECEIPT REPORT ERROR:", err.message);
  }
};


// =====================================
// CUSTOMER ACCOUNT DETAILS
// =====================================

export const accontDetails = async (id) => {
  try {
    const res = await api.get(`/customer-accounts/${id}`);
    return res.data;
  } catch (err) {
    console.log(
      "ACCOUNT DETAILS ERROR:",
      err.response?.data || err.message
    );
    throw err;
  }
};


// =====================================
// CUSTOMER LEDGER / TRANSACTION HISTORY
// =====================================

export const fetchCustomerLedger = async (id) => {
  try {
    const res = await api.get(`/customer-ledger/${id}`);
    return res.data;
  } catch (err) {
    console.log(
      "CUSTOMER LEDGER ERROR:",
      err.response?.data || err.message
    );
    throw err;
  }
};

// =====================================
// SINGLE CUSTOMER
// =====================================

export const fetchCustomer = async (id) => {
  try {
    const res = await api.get(`/customers/${id}`);
    return res;
  } catch (err) {
    console.log("FETCH CUSTOMER ERROR:", err.response?.data || err.message);
    throw err;
  }
};

// =====================================
// ADD CUSTOMER
// =====================================

export const addCustomer = async (newCustomer) => {
  try {
    const companyString = await AsyncStorage.getItem("company");

    if (!companyString) {
      throw new Error("Company not found");
    }

    const company = JSON.parse(companyString);

    const payload = {
      ...newCustomer,
      company_id: company._id,
    };

    const res = await api.post("/customers", payload);

    console.log("NEW CUSTOMER RESPONSE:", res.data);

    return res.data;
  } catch (err) {
    Alert.alert(
      "Error",
      err?.response?.data?.error || "Failed to save customer"
    );
    throw err;
  }
};

// =====================================
// DELETE CUSTOMER
// =====================================

export const deleteCustomer = async (id) => {
  try {
    await api.delete(`/customers/${id}`);

    Alert.alert("Success", "Customer deleted successfully");
    return true;
  } catch (err) {
    Alert.alert("Error", "Failed to delete customer");
    return false;
  }
};

// =====================================
// EDIT CUSTOMER
// =====================================

export const editCustomer = async (id, updatedCustomer) => {
  try {
    await api.put(`/customers/${id}`, updatedCustomer);

    Alert.alert("Success", "Customer updated successfully");
    return true;
  } catch (err) {
    Alert.alert("Error", "Failed to update customer");
    return false;
  }
};

// =====================================
// ADD CUSTOMER PAYMENT
// =====================================


// =====================================
// ADD CUSTOMER PAYMENT
// =====================================

export const addPayment = async (payload) => {
  try {
    const finalPayload = {
      customer_id: payload.client_id,
      amount: payload.amount,
      payment_method: String(payload.paymentMode || "").toUpperCase(),
      payment_date: payload.date,
      reference_no: payload.transactionId || "",
      remarks: payload.remarks || "",
    };

const response = await api.post("/payments", finalPayload);
    return response.data;
  } catch (err) {
    console.log("ADD PAYMENT ERROR:", err.response?.data || err.message);
    throw err;
  }
};


import AsyncStorage from "@react-native-async-storage/async-storage";

const SALES_KEY = "sales_cache";
const RECEIPTS_KEY = "receipts_cache";
const CUSTOMER_KEY = "customers_cache";
const VENDOR_KEY = "vendors_cache";
const PURCHASE_KEY = "purchase_cache";
const PAYABLE_KEY = "payable_cache";
const ITEM_KEY = "item_cache";
const COLLECTIONS_KEY = "collections_cache";

const save = async (key, data) => {
  try {
    await AsyncStorage.setItem(
      key,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    );
  } catch (e) {
    console.log("Cache save error", e);
  }
};

const get = async (key) => {
  try {
    const cached = await AsyncStorage.getItem(key);
    return cached ? JSON.parse(cached) : null;
  } catch (e) {
    console.log("Cache read error", e);
    return null;
  }
};

export const saveSalesCache = (data) => save(SALES_KEY, data);
export const getSalesCache = () => get(SALES_KEY);
export const clearSalesCache = () => AsyncStorage.removeItem(SALES_KEY);

export const saveCollectionsCache = (data) =>
  save(COLLECTIONS_KEY, data);

export const getCollectionsCache = () =>
  get(COLLECTIONS_KEY);

export const clearCollectionsCache = () =>
  AsyncStorage.removeItem(COLLECTIONS_KEY);

export const saveReceiptsCache = (data) => save(RECEIPTS_KEY, data);
export const getReceiptsCache = () => get(RECEIPTS_KEY);
export const clearReceiptsCache = () => AsyncStorage.removeItem(RECEIPTS_KEY);

export const savePurchaseCache = (data) => save(PURCHASE_KEY, data);
export const getPurchaseCache = () => get(PURCHASE_KEY);
export const clearPurchaseCache = () => AsyncStorage.removeItem(PURCHASE_KEY);

export const savePayablesCache = (data) => save(PAYABLE_KEY, data);
export const getPayablesCache = () => get(PAYABLE_KEY);
export const clearPayablesCache = () => AsyncStorage.removeItem(PAYABLE_KEY);

export const saveCustomersCache = (data) => save(CUSTOMER_KEY, data);
export const getCustomersCache = () => get(CUSTOMER_KEY);
export const clearCustomersCache = () => AsyncStorage.removeItem(CUSTOMER_KEY);

export const saveItemCache = (data) => save(ITEM_KEY, data);
export const getItemCache = () => get(ITEM_KEY);
export const clearItemCache = () => AsyncStorage.removeItem(ITEM_KEY);

export const saveVendorsCache = (data) => save(VENDOR_KEY, data);
export const getVendorsCache = () => get(VENDOR_KEY);
export const clearVendorsCache = () => AsyncStorage.removeItem(VENDOR_KEY);

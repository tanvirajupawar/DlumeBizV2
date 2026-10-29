
import API from "./axios";

// Fetch all products

 // Fetch all products
export const fetchProducts = async () => {
  const response = await API.get("/products");

  return (response.data.data || []).map((item) => ({
    ...item,
    price: Number(item.price ?? item.salePrice ?? item.mrp ?? 0),
    salePrice: Number(item.salePrice ?? item.price ?? item.mrp ?? 0),
  }));
};

// Fetch products by category
export const fetchProductsByCategory = async (categoryId) => {
  const response = await API.get(`/products/category/${categoryId}`);

  return (response.data.data || []).map((item) => ({
    ...item,
    price: Number(item.price ?? item.salePrice ?? item.mrp ?? 0),
    salePrice: Number(item.salePrice ?? item.price ?? item.mrp ?? 0),
  }));
};


// Create product
export const createProduct = async (data) => {
  const response = await API.post("/products", data);
  return response.data;
};

// Update product
export const updateProduct = async (id, data) => {
  const response = await API.put(`/products/${id}`, data);
  return response.data;
};

// Delete product
export const deleteProduct = async (id) => {
  const response = await API.delete(`/products/${id}`);
  return response.data;
};

// Toggle product status
export const toggleProductStatus = async (id, is_active) => {
  const response = await API.patch(`/products/${id}/status`, {
    is_active,
  });
  return response.data;
};

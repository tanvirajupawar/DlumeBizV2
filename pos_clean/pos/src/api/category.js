
import API from "./axios";

// Fetch categories for the logged-in company
export const fetchCategories = async () => {
  const response = await API.get("/categories");
  return response.data.data;
};

// Create category
export const createCategory = async (data) => {
  const response = await API.post("/categories", data);
  return response.data;
};

// Update category
export const updateCategory = async (id, data) => {
  const response = await API.put(`/categories/${id}`, data);
  return response.data;
};

// Toggle category status
export const toggleCategoryStatus = async (id, is_active) => {
  const response = await API.patch(`/categories/${id}/status`, {
    is_active,
  });
  return response.data;
};

// Delete category
export const deleteCategory = async (id) => {
  const response = await API.delete(`/categories/${id}`);
  return response.data;
};

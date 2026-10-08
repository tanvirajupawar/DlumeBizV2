import { fetchProducts } from "./product";

export const fetchCategoryProductCounts = async () => {
  try {
    const products = await fetchProducts();

    const counts = {};

    products.forEach((product) => {
      const key = product.category_id;

      if (!key) return;

      counts[key] = (counts[key] || 0) + 1;
    });

    return counts;
  } catch (error) {
    console.log(error);
    return {};
  }
};
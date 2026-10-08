import React, { useState, useCallback } from "react";

import CategoryScreen from "./CategoryScreen";
import ProductScreen from "../screens/Product/ProductScreen";

/**
 * CategoriesFlow
 * ────────────────────────────────────────────────────────────────────────
 * Owns the Categories ↔ Product List navigation *without* React Navigation.
 * This is the component your sidebar's "Categories" tab should render.
 *
 * Usage in your sidebar/router:
 *
 *   import CategoriesFlow from "./screens/CategoriesFlow";
 *   ...
 *   case "categories":
 *     return <CategoriesFlow />;
 *
 * Internally it just swaps which screen is mounted based on whether a
 * category has been selected — exactly the "switch components" pattern
 * requested, no navigator needed.
 */
const CategoriesFlow = () => {
  const [selectedCategory, setSelectedCategory] = useState(null);

  const handleCategoryPress = useCallback((category) => {
    setSelectedCategory(category);
  }, []);

  const handleBackToCategories = useCallback(() => {
    setSelectedCategory(null);
  }, []);

  if (selectedCategory) {
    return (
      <ProductScreen
        category={selectedCategory}
        onBack={handleBackToCategories}
      />
    );
  }

  return <CategoryScreen onCategoryPress={handleCategoryPress} />;
};

export default CategoriesFlow;
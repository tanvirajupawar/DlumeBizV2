// utils/unitOptions.js
// Single place that knows how a product's bag sizes (units per bag) are stored.
// If your product object uses different field names, change ONLY this file.
// (Pricing is handled separately for now: the product's list price, as before.)

export const DEFAULT_UNITS = 120; // used on a plain tap
export const FALLBACK_UNIT_SIZES = [1,5, 60,100,120,150,200]; // used if the product has none

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Same list-price lookup the old modal used.
export const getListPrice = (product) =>
  Number(
    product?.price ??
      product?.selling_price ??
      product?.sale_price ??
      product?.rate ??
      product?.sellingPrice ??
      0
  ) || 0;

// ADJUST HERE: fields that may hold the product's bag-size list.
const UNIT_LIST_FIELDS = [
  "bag_units",
  "units_per_bag_options",
  "packing_units",
  "unit_prices",
  "units",
];

// Returns a de-duplicated array of numbers, e.g. [120, 60, 150].
export function getUnitOptions(product) {
  const raw = UNIT_LIST_FIELDS.map((f) => product?.[f]).find(Array.isArray);
  const sizes = (raw || [])
    .map((e) =>
      typeof e === "object" && e !== null
        ? toNum(e.units ?? e.units_per_bag ?? e.qty ?? e.size)
        : toNum(e)
    )
    .filter((n) => n > 0);

  return [...new Set(sizes.length ? sizes : FALLBACK_UNIT_SIZES)];
}

export const getDefaultUnit = (sizes) =>
  sizes.includes(DEFAULT_UNITS) ? DEFAULT_UNITS : sizes[0];

import mongoose from "mongoose";
import Product from "../models/product.model.js";
import StockManagement from "../models/stock_management.model.js";
import Category from "../models/category.model.js";

const getCompanyId = (req) => req.user?.company_id;

const validId = (id) => mongoose.isValidObjectId(id);

const findCategory = async (categoryId, companyId) => {
  if (!categoryId) return null;
  if (!validId(categoryId)) return undefined;

  return Category.findOne({
    _id: categoryId,
    company_id: companyId,
  });
};

const getStock = async (productId, companyId) => {
  let stock = await StockManagement.findOne({
    product_id: productId,
    company_id: companyId,
  });

  if (!stock) {
    stock = await StockManagement.create({
      product_id: productId,
      company_id: companyId,
      in: 0,
      out: 0,
      total_stock: 0,
    });
  }

  return stock;
};

const formatProduct = (product, stock = {}) => {
  const p = product.toObject ? product.toObject() : product;
  const stockIn = Number(stock.in || 0);
  const stockOut = Number(stock.out || 0);
  const totalStock = Number(stock.total_stock ?? stockIn - stockOut);

  return {
    ...p,
    id: p._id,
    name: p.product || "",
    product: p.product || "",
    category: p.category || "",
    category_id: p.category_id || null,
    purchasePrice: Number(p.purchase_price || 0),
    salePrice: Number(p.mrp || 0),
    stock_in: stockIn,
    stock_out: stockOut,
    total_stock: totalStock,
    stock: totalStock,
    barcodeQty: Number(p.barcode_qty || 1),
    is_active: p.is_active !== false,
  };
};

export const createProduct = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const data = { ...req.body };

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Authenticated company not found",
      });
    }

    if (!data.product || !String(data.product).trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    let categoryName = "";

    if (data.category_id) {
      const category = await findCategory(data.category_id, companyId);

      if (category === undefined) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID",
        });
      }

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

     categoryName = category.category;
    }

    const initialQty = Number(data.qty || 0);

    if (!Number.isFinite(initialQty) || initialQty < 0) {
      return res.status(400).json({
        success: false,
        message: "Opening stock must be zero or greater",
      });
    }

    let barcode = data.barcode
      ? String(data.barcode).trim()
      : "";

    if (!barcode) {
      // Generate a company-specific barcode.
      const lastProduct = await Product.findOne({
        company_id: companyId,
        barcode: { $regex: /^DL\d+$/ },
      }).sort({ barcode: -1 });

      const lastNumber = lastProduct?.barcode
        ? Number(lastProduct.barcode.slice(2))
        : 100000;

      barcode = `DL${lastNumber + 1}`;
    }

    const product = await Product.create({
      ...data,
      product: String(data.product).trim(),
      barcode,
      qty: initialQty,
      category: categoryName,
      category_id: data.category_id || null,
      company_id: companyId,
      createdBy: String(req.user._id),
    });

    await StockManagement.create({
      product_id: product._id,
      company_id: companyId,
      in: initialQty,
      out: 0,
      total_stock: initialQty,
    });

    const stock = await StockManagement.findOne({
      product_id: product._id,
      company_id: companyId,
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: formatProduct(product, stock),
    });
  } catch (error) {
    console.error("CREATE PRODUCT ERROR:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A product with this barcode already exists in this company",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

export const fetchProducts = async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    const products = await Product.find({
      company_id: companyId,
    }).sort({ createdAt: -1 }).lean();

    const stocks = await StockManagement.find({
      company_id: companyId,
    }).lean();

    const stockMap = new Map(
      stocks.map((stock) => [String(stock.product_id), stock])
    );

    return res.json({
      success: true,
      data: products.map((product) =>
        formatProduct(
          product,
          stockMap.get(String(product._id)) || {}
        )
      ),
    });
  } catch (error) {
    console.error("FETCH PRODUCTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

export const fetchProduct = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;

    if (!validId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findOne({
      _id: id,
      company_id: companyId,
    }).populate("category_id", "category");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const stock = await StockManagement.findOne({
      product_id: product._id,
      company_id: companyId,
    }).lean();

    return res.json({
      success: true,
      data: formatProduct(product, stock || {}),
    });
  } catch (error) {
    console.error("FETCH PRODUCT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

export const fetchByCategory = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;

    if (!validId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    const category = await Category.findOne({
      _id: id,
      company_id: companyId,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const products = await Product.find({
      category_id: id,
      company_id: companyId,
    }).lean();

    const stocks = await StockManagement.find({
      company_id: companyId,
    }).lean();

    const stockMap = new Map(
      stocks.map((stock) => [String(stock.product_id), stock])
    );

    return res.json({
      success: true,
      data: products.map((product) =>
        formatProduct(
          product,
          stockMap.get(String(product._id)) || {}
        )
      ),
    });
  } catch (error) {
    console.error("FETCH PRODUCTS BY CATEGORY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    const data = { ...req.body };

    if (!validId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findOne({
      _id: id,
      company_id: companyId,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

const stockAdjustment = Number(data.stock_adjustment ?? 0);
const stockIn = data.stock_in;
const stockOut = data.stock_out;

delete data.stock_adjustment;

    delete data.stock_in;
    delete data.stock_out;
    delete data.stock;
    delete data.total_stock;
    delete data.company_id;
    delete data.createdBy;
    delete data._id;

    if (data.category_id) {
      const category = await findCategory(data.category_id, companyId);

      if (category === undefined) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID",
        });
      }

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

     data.category = category.category;
    } else if (data.category_id === null || data.category_id === "") {
      data.category_id = null;
      data.category = "";
    }

    if (data.product !== undefined) {
      data.product = String(data.product).trim();

      if (!data.product) {
        return res.status(400).json({
          success: false,
          message: "Product name cannot be empty",
        });
      }
    }

    Object.assign(product, data, {
      updatedBy: String(req.user._id),
    });

    await product.save();

  // Apply stock adjustments from Edit Product.
if (stockAdjustment !== 0) {
  if (!Number.isFinite(stockAdjustment)) {
    return res.status(400).json({
      success: false,
      message: "Stock adjustment must be a valid number",
    });
  }

  const stock = await getStock(id, companyId);

  const currentStock =
    Number(stock.total_stock ?? (
      Number(stock.in || 0) - Number(stock.out || 0)
    ));

  const newStock = currentStock + stockAdjustment;

  if (newStock < 0) {
    return res.status(400).json({
      success: false,
      message: "Stock cannot be less than zero",
    });
  }

  if (stockAdjustment > 0) {
    stock.in = Number(stock.in || 0) + stockAdjustment;
  } else {
    stock.out =
      Number(stock.out || 0) + Math.abs(stockAdjustment);
  }

  await stock.save();
} else if (stockIn !== undefined || stockOut !== undefined) {
  // Keep support for existing stock_in / stock_out requests.
  const add = Number(stockIn || 0);
  const subtract = Number(stockOut || 0);

  if (
    !Number.isFinite(add) ||
    !Number.isFinite(subtract) ||
    add < 0 ||
    subtract < 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Stock adjustments must be zero or greater",
    });
  }

  const stock = await getStock(id, companyId);
  const currentStock = Number(
    stock.total_stock ??
      (Number(stock.in || 0) - Number(stock.out || 0))
  );

  if (currentStock + add - subtract < 0) {
    return res.status(400).json({
      success: false,
      message: "Stock cannot be less than zero",
    });
  }

  stock.in = Number(stock.in || 0) + add;
  stock.out = Number(stock.out || 0) + subtract;

  await stock.save();
}

    const stock = await StockManagement.findOne({
      product_id: id,
      company_id: companyId,
    }).lean();

    return res.json({
      success: true,
      message: "Product updated successfully",
      data: formatProduct(product, stock || {}),
    });
  } catch (error) {
    console.error("UPDATE PRODUCT ERROR:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A product with this barcode already exists in this company",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

export const addStock = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    const addedStock = Number(req.body.stock);

    if (!validId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    if (!Number.isFinite(addedStock) || addedStock <= 0) {
      return res.status(400).json({
        success: false,
        message: "Add stock must be greater than 0",
      });
    }

    const product = await Product.findOne({
      _id: id,
      company_id: companyId,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const stock = await getStock(id, companyId);
    stock.in = Number(stock.in || 0) + addedStock;
    await stock.save();

    return res.json({
      success: true,
      message: "Stock added successfully",
      data: {
        product,
        stock,
        added: addedStock,
        total_stock: stock.total_stock,
      },
    });
  } catch (error) {
    console.error("ADD STOCK ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

export const toggleStatus = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    const { is_active } = req.body;

    if (!validId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    if (typeof is_active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "is_active must be true or false",
      });
    }

    const product = await Product.findOneAndUpdate(
      {
        _id: id,
        company_id: companyId,
      },
      {
        $set: {
          is_active,
          updatedBy: String(req.user._id),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.json({
      success: true,
      message: `Product marked as ${is_active ? "active" : "inactive"}`,
      data: product,
    });
  } catch (error) {
    console.error("TOGGLE PRODUCT STATUS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;

    if (!validId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const deleted = await Product.findOneAndDelete({
      _id: id,
      company_id: companyId,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    await StockManagement.deleteOne({
      product_id: id,
      company_id: companyId,
    });

    return res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("DELETE PRODUCT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

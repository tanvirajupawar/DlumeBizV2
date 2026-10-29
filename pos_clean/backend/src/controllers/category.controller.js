
import mongoose from "mongoose";
import Category from "../models/category.model.js";
import Product from "../models/product.model.js";

const getCompanyId = (req) => req.user?.company_id;
const validId = (id) => mongoose.isValidObjectId(id);

// CREATE CATEGORY
export const createCategory = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const categoryName = String(req.body.category || "").trim();

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Authenticated company not found",
      });
    }

    if (!categoryName) {
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }

    const exists = await Category.findOne({
      company_id: companyId,
      category: categoryName,
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Category already exists",
      });
    }

    const category = await Category.create({
      category: categoryName,
      company_id: companyId,
      createdBy: String(req.user._id),
    });

    return res.status(201).json({
      success: true,
      data: category,
      message: "Category Created Successfully",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Category already exists",
      });
    }

    console.error("CREATE CATEGORY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// FETCH ALL CATEGORIES
export const fetchCategories = async (req, res) => {
  try {
    const categories = await Category.find({
      company_id: getCompanyId(req),
    }).sort({ category: 1 });

    return res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("FETCH CATEGORIES ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// FETCH SINGLE CATEGORY
export const fetchCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    const category = await Category.findOne({
      _id: id,
      company_id: getCompanyId(req),
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }



    return res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("FETCH CATEGORY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// UPDATE CATEGORY
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = getCompanyId(req);
    const categoryName = String(req.body.category || "").trim();

    if (!validId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    if (!categoryName) {
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }

    const exists = await Category.findOne({
      company_id: companyId,
      category: categoryName,
      _id: { $ne: id },
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Category already exists",
      });
    }

    const category = await Category.findOneAndUpdate(
      {
        _id: id,
        company_id: companyId,
      },
      {
        $set: {
          category: categoryName,
          updatedBy: String(req.user._id),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    await Product.updateMany(
  {
    company_id: companyId,
    category_id: category._id,
  },
  {
    $set: {
      category: category.category,
      updatedBy: String(req.user._id),
    },
  }
);

    return res.json({
      success: true,
      message: "Category Updated Successfully",
      data: category,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Category already exists",
      });
    }

    console.error("UPDATE CATEGORY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// DELETE CATEGORY
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    const deleted = await Category.findOneAndDelete({
      _id: id,
      company_id: getCompanyId(req),
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.json({
      success: true,
      message: "Category Deleted Successfully",
    });
  } catch (error) {
    console.error("DELETE CATEGORY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// TOGGLE CATEGORY STATUS
export const toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (!validId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    if (typeof is_active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "is_active must be true or false",
      });
    }

    const category = await Category.findOneAndUpdate(
      {
        _id: id,
        company_id: getCompanyId(req),
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

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.json({
      success: true,
      message: `Category marked as ${is_active ? "active" : "inactive"}`,
      data: category,
    });
  } catch (error) {
    console.error("TOGGLE CATEGORY STATUS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

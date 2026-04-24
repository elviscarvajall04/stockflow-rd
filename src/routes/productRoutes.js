const express = require("express");
const router = express.Router();

const {
  getProducts,
  getLowStockProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const verifyToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

// RUTAS PROTEGIDAS (todos los usuarios logueados)
router.get("/", verifyToken, getProducts);
router.get("/low-stock", verifyToken, getLowStockProducts);
router.get("/:id", verifyToken, getProductById);

// SOLO ADMIN
router.post("/", verifyToken, authorizeRoles("admin"), createProduct);
router.put("/:id", verifyToken, authorizeRoles("admin"), updateProduct);
router.delete("/:id", verifyToken, authorizeRoles("admin"), deleteProduct);

module.exports = router;
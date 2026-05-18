const express = require("express");
const router = express.Router();

const {
  createSale,
  getSales,
  getSaleById,
  cancelSale,
  updateSale,
  deleteSale,
} = require("../controllers/saleController");

const verifyToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

// 🔒 PROTEGIDAS
router.post("/", verifyToken, createSale);
router.get("/", verifyToken, getSales);
router.get("/:id", verifyToken, getSaleById);
router.put("/:id", verifyToken, updateSale);
router.put("/:id/cancel", verifyToken, cancelSale);
router.delete("/:id", verifyToken, authorizeRoles("admin"), deleteSale);

module.exports = router;